import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const admin = '00000000-0000-0000-0000-000000000001';
const alice = '00000000-0000-0000-0000-000000000002';
const bob = '00000000-0000-0000-0000-000000000003';
const course = '10000000-0000-0000-0000-000000000001';
const lesson = '30000000-0000-0000-0000-000000000001';
let order;
async function as(user, sql, params = []) {
  await db.exec(`reset role; set role ${user ? 'authenticated' : 'anon'};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user || '']);
  return db.query(sql, params);
}
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(
    await readFile(new URL('../supabase/migrations/001_lms.sql', import.meta.url), 'utf8'),
  );
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/004_admin_directory.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(
    await readFile(new URL('../supabase/migrations/003_admin_roles.sql', import.meta.url), 'utf8'),
  );
  await db.query(
    `insert into auth.users(id,email) values($1,'admin@example.test'),($2,'alice@example.test'),($3,'bob@example.test')`,
    [admin, alice, bob],
  );
  await db.query('update public.profiles set is_admin=true where id=$1', [admin]);
  await db.query('update public.courses set published=true where id=$1', [course]);
  await db.query(
    "update public.lesson_contents set body='PRIVATE_BODY',video_url='https://drive.google.com/file/d/SECRET/view' where lesson_id=$1",
    [lesson],
  );
  await db.query(
    "insert into public.resources(lesson_id,title,url) values($1,'Secret','https://drive.google.com/file/d/ASSET/view')",
    [lesson],
  );
  // Minimal Storage contract mock to execute and test our real bucket/policy migration.
  await db.exec(`create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  await db.exec(
    await readFile(new URL('../supabase/migrations/002_storage.sql', import.meta.url), 'utf8'),
  );
});
after(async () => {
  await db?.close();
});

test('public catalog exposes metadata only, and drafts stay private', async () => {
  const courses = await as(null, 'select * from public.courses');
  assert.equal(courses.rows.length, 1);
  assert.equal((await as(null, 'select * from public.lessons')).rows.length, 4);
  await assert.rejects(as(null, 'select * from public.lesson_contents'), /permission denied/);
  await assert.rejects(as(null, 'select * from public.resources'), /permission denied/);
  await assert.rejects(as(null, 'select * from public.course_private'), /permission denied/);
  await assert.rejects(as(null, 'select public.create_order($1)', [course]), /permission denied/);
});
test('unenrolled user cannot read private content, escalate role, or inject orders', async () => {
  assert.equal((await as(alice, 'select * from public.lesson_contents')).rows.length, 0);
  assert.equal((await as(alice, 'select * from public.resources')).rows.length, 0);
  await assert.rejects(
    as(alice, 'update public.profiles set is_admin=true where id=$1', [alice]),
    /permission denied/,
  );
  await assert.rejects(
    as(
      alice,
      "insert into public.orders(user_id,course_id,amount,transfer_code) values($1,$2,0,'FAKE')",
      [alice, course],
    ),
    /permission denied/,
  );
  await assert.rejects(as(alice, 'select public.record_progress($1,true)', [lesson]), /quyền học/);
});
test('checkout requires bank configuration and uses server price, with no duplicate open order', async () => {
  await assert.rejects(
    as(alice, 'select * from public.create_order($1)', [course]),
    /thông tin thanh toán/,
  );
  await as(
    admin,
    "update public.settings set bank_name='Test',bank_account='123',bank_owner='TEST' where id=1",
  );
  order = (await as(alice, 'select * from public.create_order($1)', [course])).rows[0];
  assert.equal(Number(order.amount), 599000);
  assert.match(order.transfer_code, /^HV[A-F0-9]{32}$/);
  assert.equal(
    (await as(alice, 'select * from public.create_order($1)', [course])).rows[0].id,
    order.id,
  );
  assert.equal((await as(alice, 'select * from public.orders')).rows.length, 1);
});
test('ownership and admin checks resist direct API calls', async () => {
  assert.equal((await as(bob, 'select * from public.orders')).rows.length, 0);
  await assert.rejects(as(bob, 'select public.report_payment($1)', [order.id]), /quyền truy cập/);
  await assert.rejects(
    as(alice, "select public.admin_order_action($1,'grant_access')", [order.id]),
    /admin/,
  );
  await assert.rejects(
    as(admin, "select public.admin_order_action($1,'grant_access')", [order.id]),
    /thanh toán/,
  );
  await assert.rejects(
    as(
      alice,
      "insert into public.enrollments(user_id,course_id,drive_status,drive_email) values($1,$2,'shared','fake')",
      [alice, course],
    ),
    /permission denied/,
  );
});
test('payment report and receipt confirmation do not grant access', async () => {
  await as(alice, 'select public.report_payment($1)', [order.id]);
  await as(alice, 'select public.report_payment($1)', [order.id]);
  assert.equal((await as(alice, 'select status from public.orders')).rows[0].status, 'reported');
  await as(admin, "select public.admin_order_action($1,'confirm_payment')", [order.id]);
  await as(admin, "select public.admin_order_action($1,'confirm_payment')", [order.id]);
  assert.equal((await as(alice, 'select * from public.lesson_contents')).rows.length, 0);
  assert.equal((await as(alice, 'select * from public.enrollments')).rows.length, 0);
});
test('Drive confirmation unlocks once; completion and resume are idempotent', async () => {
  await as(admin, "select public.admin_order_action($1,'grant_access')", [order.id]);
  await as(admin, "select public.admin_order_action($1,'grant_access')", [order.id]);
  assert.equal((await as(alice, 'select * from public.enrollments')).rows.length, 1);
  assert.equal(
    (await as(alice, 'select body from public.lesson_contents where lesson_id=$1', [lesson]))
      .rows[0].body,
    'PRIVATE_BODY',
  );
  assert.equal((await as(alice, 'select * from public.resources')).rows.length, 1);
  await as(alice, 'select public.record_progress($1,true)', [lesson]);
  await as(alice, 'select public.record_progress($1,true)', [lesson]);
  await as(alice, 'select public.record_progress($1)', [lesson]);
  const progress = (await as(alice, 'select * from public.progress')).rows;
  assert.equal(progress.length, 1);
  assert.equal(progress[0].completed, true);
  assert.equal((await as(bob, 'select * from public.progress')).rows.length, 0);
  assert.equal((await as(bob, 'select * from public.enrollments')).rows.length, 0);
  await assert.rejects(as(alice, 'select * from public.create_order($1)', [course]), /đã có quyền/);
});
test('revocation locks content immediately; stale fulfillment cannot regrant; Drive remains pending', async () => {
  await as(admin, "select public.admin_access_action($1,$2,'revoke')", [alice, course]);
  await as(admin, "select public.admin_access_action($1,$2,'revoke')", [alice, course]);
  await as(admin, "select public.admin_order_action($1,'grant_access')", [order.id]);
  const e = (await as(alice, 'select * from public.enrollments')).rows[0];
  assert.equal(e.active, false);
  assert.equal(e.drive_status, 'revoke_pending');
  assert.equal((await as(alice, 'select * from public.lesson_contents')).rows.length, 0);
  assert.equal((await as(alice, 'select * from public.resources')).rows.length, 0);
  await assert.rejects(as(alice, 'select public.record_progress($1,true)', [lesson]), /quyền học/);
  await as(admin, "select public.admin_access_action($1,$2,'confirm_drive_revoked')", [
    alice,
    course,
  ]);
  assert.equal(
    (await as(alice, 'select drive_status from public.enrollments')).rows[0].drive_status,
    'revoked',
  );
});
test('audit is admin-only and records each transition exactly once', async () => {
  assert.equal((await as(alice, 'select * from public.audit_log')).rows.length, 0);
  const logs = (await as(admin, 'select action from public.audit_log')).rows;
  assert.equal(logs.length, 4);
  assert.deepEqual(
    logs.map((r) => r.action).sort(),
    ['confirm_drive_revoked', 'confirm_payment', 'grant_access', 'revoke'].sort(),
  );
});
test('only admin can upload thumbnails, and cannot write other buckets', async () => {
  await assert.rejects(
    as(
      alice,
      "insert into storage.objects(bucket_id,name) values('course-thumbnails','attack.jpg')",
    ),
    /row-level security/,
  );
  await as(
    admin,
    "insert into storage.objects(bucket_id,name) values('course-thumbnails','ok.jpg')",
  );
  await assert.rejects(
    as(admin, "insert into storage.objects(bucket_id,name) values('private-videos','bad.mp4')"),
    /row-level security/,
  );
  assert.equal((await as(null, 'select * from storage.objects')).rows.length, 1);
});
test('cancellation is idempotent and a new purchase can be created', async () => {
  const o = (await as(bob, 'select * from public.create_order($1)', [course])).rows[0];
  await as(admin, "select public.admin_order_action($1,'cancel')", [o.id]);
  await as(admin, "select public.admin_order_action($1,'cancel')", [o.id]);
  const newOrder = (await as(bob, 'select * from public.create_order($1)', [course])).rows[0];
  assert.notEqual(newOrder.id, o.id);
});
test('open orders preserve their original price when admin changes course price', async () => {
  const existing = (await as(bob, 'select * from public.create_order($1)', [course])).rows[0];
  await as(admin, 'update public.courses set price=999000 where id=$1', [course]);
  const again = (await as(bob, 'select * from public.create_order($1)', [course])).rows[0];
  assert.equal(again.id, existing.id);
  assert.equal(Number(again.amount), 599000);
});
test('admin can edit curriculum; learners cannot mutate content or other progress', async () => {
  await as(admin, "update public.lessons set title='Updated lesson',position=10 where id=$1", [
    lesson,
  ]);
  assert.equal(
    (await as(alice, 'select title from public.lessons where id=$1', [lesson])).rows[0].title,
    'Updated lesson',
  );
  const before = (
    await as(alice, 'update public.lessons set title=$1 where id=$2 returning *', [
      'FORGED',
      lesson,
    ])
  ).rows;
  assert.equal(before.length, 0);
  await assert.rejects(
    as(alice, "insert into public.modules(course_id,title) values($1,'FORGED')", [course]),
    /row-level security/,
  );
  await assert.rejects(
    as(alice, 'update public.progress set completed=true where user_id=$1', [bob]),
    /permission denied/,
  );
  assert.equal((await as(admin, 'select * from public.courses')).rows.length, 3);
});
test('unpublishing a course hides metadata and blocks enrolled users', async () => {
  const o = (await as(bob, 'select * from public.create_order($1)', [course])).rows[0];
  await as(admin, "select public.admin_order_action($1,'confirm_payment')", [o.id]);
  await as(admin, "select public.admin_order_action($1,'grant_access')", [o.id]);
  assert.equal((await as(bob, 'select * from public.resources')).rows.length, 1);
  await as(admin, 'update public.courses set published=false where id=$1', [course]);
  assert.equal((await as(null, 'select * from public.lessons')).rows.length, 0);
  assert.equal((await as(bob, 'select * from public.resources')).rows.length, 0);
  await assert.rejects(as(bob, 'select public.record_progress($1,true)', [lesson]), /quyền học/);
  assert.equal((await as(admin, 'select * from public.resources')).rows.length, 1);
});

test('admin roles require current admin rights, reject self-removal, and log changes once', async () => {
  await assert.rejects(
    as(null, 'select public.admin_set_role($1,true)', [bob]),
    /permission denied/,
  );
  await assert.rejects(
    as(alice, 'select public.admin_set_role($1,true)', [alice]),
    /Chỉ quản trị viên/,
  );
  await assert.rejects(
    as(admin, 'select public.admin_set_role($1,false)', [admin]),
    /Không thể tự/,
  );
  await assert.rejects(
    as(admin, 'select public.admin_set_role($1,null)', [bob]),
    /Quyền không hợp lệ/,
  );
  await assert.rejects(
    as(admin, 'select public.admin_set_role($1,true)', ['00000000-0000-0000-0000-000000000099']),
    /Tài khoản chưa tồn tại/,
  );
  await as(admin, 'select public.admin_set_role($1,true)', [bob]);
  await as(admin, 'select public.admin_set_role($1,true)', [bob]);
  assert.equal((await as(bob, 'select private.is_admin() as allowed')).rows[0].allowed, true);
  await as(admin, 'select public.admin_set_role($1,false)', [bob]);
  await as(admin, 'select public.admin_set_role($1,false)', [bob]);
  await assert.rejects(
    as(bob, 'select public.admin_set_role($1,true)', [bob]),
    /Chỉ quản trị viên/,
  );
  assert.equal(
    (
      await as(
        admin,
        "select count(*)::int as n from public.audit_log where action in ('grant_admin','revoke_admin') and target_id=$1",
        [bob],
      )
    ).rows[0].n,
    2,
  );
});

test('admin directories protect data and paginate filtered results with stable ordering', async () => {
  await assert.rejects(as(null, "select public.admin_directory('orders')"), /permission denied/);
  await assert.rejects(as(alice, "select public.admin_directory('students')"), /Chỉ quản trị viên/);
  await assert.rejects(
    as(bob, 'select public.admin_student_detail($1)', [alice]),
    /Chỉ quản trị viên/,
  );
  await assert.rejects(
    as(admin, "select public.admin_directory('orders',p_from=>'2026-10-08',p_to=>'2026-10-07')"),
    /Ngày bắt đầu/,
  );
  await db.exec('reset role');
  await db.query(
    `insert into public.orders(user_id,course_id,amount,transfer_code,status,created_at)
    select $1,$2,200000,'PAGE_TEST_'||n,'cancelled', '2026-10-07 05:00:00+00'::timestamptz from generate_series(1,61) n`,
    [alice, course],
  );
  const list = async (page) =>
    (
      await as(
        admin,
        "select public.admin_directory('orders',p_search=>'PAGE_TEST_',p_page=>$1,p_size=>25) as data",
        [page],
      )
    ).rows[0].data;
  const pages = [1, 2, 3];
  const results = [];
  for (const p of pages) results.push(await list(p));
  assert.deepEqual(
    results.map((r) => r.rows.length),
    [25, 25, 11],
  );
  assert.equal(results[0].total, 61);
  assert.equal(new Set(results.flatMap((r) => r.rows.map((o) => o.id))).size, 61);
  assert.equal((await list(999)).page, 3);
  const none = (
    await as(admin, "select public.admin_directory('orders',p_search=>'DOES_NOT_EXIST') as data")
  ).rows[0].data;
  assert.deepEqual(none.rows, []);
  assert.equal(none.total, 0);
  const students = (
    await as(
      admin,
      "select public.admin_directory('students',p_search=>'ALICE@',p_role=>'student',p_size=>1) as data",
    )
  ).rows[0].data;
  assert.equal(students.total, 1);
  assert.equal(students.rows[0].email, 'alice@example.test');
  const admins = (
    await as(admin, "select public.admin_directory('students',p_role=>'admin') as data")
  ).rows[0].data;
  assert.equal(admins.total, 1);
  assert.equal(admins.rows[0].id, admin);
  const detail = (await as(admin, 'select public.admin_student_detail($1) as data', [bob])).rows[0]
    .data;
  assert.ok(detail.length > 0);
  assert.equal(detail[0].total_lessons, 4);
});

test('order day filters include the full Vietnamese calendar day and combine with course/status/email', async () => {
  await db.exec('reset role');
  for (const [code, time] of [
    ['BOUNDARY_BEFORE', '2026-10-06 16:59:59+00'],
    ['BOUNDARY_START', '2026-10-06 17:00:00+00'],
    ['BOUNDARY_END', '2026-10-07 16:59:59+00'],
    ['BOUNDARY_AFTER', '2026-10-07 17:00:00+00'],
  ]) {
    await db.query(
      "insert into public.orders(user_id,course_id,amount,transfer_code,status,created_at) values($1,$2,0,$3,'cancelled',$4)",
      [alice, course, code, time],
    );
  }
  const r = (
    await as(
      admin,
      "select public.admin_directory('orders',p_search=>'BOUNDARY_',p_from=>'2026-10-07',p_to=>'2026-10-07',p_status=>'cancelled',p_course=>$1) as data",
      [course],
    )
  ).rows[0].data;
  assert.equal(r.total, 2);
  assert.deepEqual(
    r.rows.map((o) => o.transfer_code),
    ['BOUNDARY_END', 'BOUNDARY_START'],
  );
  const none = (
    await as(
      admin,
      "select public.admin_directory('orders',p_search=>'BOUNDARY_',p_status=>'paid') as data",
    )
  ).rows[0].data;
  assert.equal(none.total, 0);
  const pending = (
    await as(
      admin,
      "select public.admin_directory('students',p_status=>'active',p_course=>$1) as data",
      [course],
    )
  ).rows[0].data;
  assert.ok(pending.rows.some((p) => p.id === bob));
});

test('curriculum moves are admin-only, atomic and confined to one course', async () => {
  await db.exec('reset role');
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/005_curriculum_order.sql', import.meta.url),
      'utf8',
    ),
  );
  const c = '90000000-0000-0000-0000-000000000001';
  const foreign = '90000000-0000-0000-0000-000000000002';
  await db.query(
    "insert into public.courses(id,slug,title) values($1,'sort-test','Sort test'),($2,'sort-other','Other')",
    [c, foreign],
  );
  const modules = (
    await db.query(
      "insert into public.modules(course_id,title,position) values($1,'A',0),($1,'B',1),($1,'C',2) returning id",
      [c],
    )
  ).rows.map((r) => r.id);
  const external = (
    await db.query(
      "insert into public.modules(course_id,title) values($1,'Foreign') returning id",
      [foreign],
    )
  ).rows[0].id;
  const lessons = (
    await db.query(
      "insert into public.lessons(module_id,title,position) values($1,'One',0),($1,'Two',1),($1,'Three',2) returning id",
      [modules[0]],
    )
  ).rows.map((r) => r.id);
  await assert.rejects(
    as(null, "select public.admin_move_curriculum($1,'module',$2,null,1)", [c, modules[0]]),
    /permission denied/,
  );
  await assert.rejects(
    as(alice, "select public.admin_move_curriculum($1,'module',$2,null,1)", [c, modules[0]]),
    /Chỉ quản trị viên/,
  );
  await as(admin, "select public.admin_move_curriculum($1,'module',$2,null,2)", [c, modules[0]]);
  const sorted = (
    await as(admin, 'select id,position from public.modules where course_id=$1 order by position', [
      c,
    ])
  ).rows;
  assert.deepEqual(
    sorted.map((r) => r.id),
    [modules[1], modules[2], modules[0]],
  );
  assert.deepEqual(
    sorted.map((r) => r.position),
    [0, 1, 2],
  );
  await as(admin, "select public.admin_move_curriculum($1,'lesson',$2,$3,0)", [
    c,
    lessons[2],
    modules[0],
  ]);
  assert.equal(
    (
      await as(admin, 'select id from public.lessons where module_id=$1 order by position', [
        modules[0],
      ])
    ).rows[0].id,
    lessons[2],
  );
  await as(admin, "select public.admin_move_curriculum($1,'lesson',$2,$3,0)", [
    c,
    lessons[2],
    modules[1],
  ]);
  const moved = (
    await as(admin, 'select module_id,position from public.lessons where id=$1', [lessons[2]])
  ).rows[0];
  assert.equal(moved.module_id, modules[1]);
  assert.equal(moved.position, 0);
  assert.deepEqual(
    (
      await as(admin, 'select position from public.lessons where module_id=$1 order by position', [
        modules[0],
      ])
    ).rows.map((r) => r.position),
    [0, 1],
  );
  await assert.rejects(
    as(admin, "select public.admin_move_curriculum($1,'lesson',$2,$3,0)", [
      c,
      lessons[0],
      external,
    ]),
    /không thuộc/,
  );
  assert.equal(
    (await as(admin, 'select module_id from public.lessons where id=$1', [lessons[0]])).rows[0]
      .module_id,
    modules[0],
  );
  await assert.rejects(
    as(admin, "select public.admin_move_curriculum($1,'module',$2,null,-1)", [c, modules[0]]),
    /Vị trí/,
  );
});

test('support pages and reports enforce public reading, admin editing and private attachments', async () => {
  await db.exec('reset role');
  await db.exec(await readFile(new URL('../supabase/migrations/006_support_pages.sql', import.meta.url), 'utf8'));
  assert.equal((await as(null,'select * from public.site_pages')).rows.length,4);
  assert.equal((await as(alice,"update public.site_pages set body='tampered' returning slug")).rows.length,0);
  assert.equal((await as(admin,"update public.site_pages set body='Updated content' where slug='mentor-1vs1' returning slug")).rows.length,1);
  await assert.rejects(()=>as(null,"insert into public.bug_reports(message,page_path) values('Anonymous report','/learn/test')"));
  const report=(await as(alice,"insert into public.bug_reports(message,page_path,image_path) values('Video does not load','/learn/test',$1) returning id",[alice+'/test.png'])).rows[0];
  assert.equal((await as(bob,'select * from public.bug_reports')).rows.length,0);
  assert.equal((await as(alice,"update public.bug_reports set status='resolved' returning id")).rows.length,0);
  assert.equal((await as(admin,"update public.bug_reports set status='resolved' where id=$1 returning id",[report.id])).rows.length,1);
  await assert.rejects(()=>as(alice,"insert into public.bug_reports(message,page_path,image_path) values('Spoof attachment','/learn/test',$1)",[bob+'/test.png']));
  await as(alice,"insert into storage.objects(bucket_id,name) values('bug-reports',$1)",[alice+'/test.png']);
  assert.equal((await as(bob,"select * from storage.objects where bucket_id='bug-reports'")).rows.length,0);
  assert.equal((await as(admin,"select * from storage.objects where bucket_id='bug-reports'")).rows.length,1);
});

test('course deletion is admin-only, cascades curriculum and protects purchase history', async () => {
  const c = (await as(admin, "insert into public.courses(slug,title,published) values('delete-test','Delete test',true) returning id")).rows[0].id;
  const m = (await as(admin, "insert into public.modules(course_id,title) values($1,'Module') returning id", [c])).rows[0].id;
  const l = (await as(admin, "insert into public.lessons(module_id,title) values($1,'Lesson') returning id", [m])).rows[0].id;
  await as(admin, "insert into public.lesson_contents(lesson_id,body) values($1,'Body')", [l]);
  assert.equal((await as(alice, 'delete from public.courses where id=$1 returning id', [c])).rows.length, 0);
  assert.equal((await as(admin, 'delete from public.courses where id=$1 returning id', [c])).rows.length, 1);
  assert.equal((await as(admin, 'select * from public.modules where id=$1', [m])).rows.length, 0);
  assert.equal((await as(admin, 'select * from public.lessons where id=$1', [l])).rows.length, 0);
  assert.equal((await as(admin, 'select * from public.lesson_contents where lesson_id=$1', [l])).rows.length, 0);
  for (const relation of ['orders', 'enrollments']) {
    const protectedId = (await as(admin, "insert into public.courses(slug,title) values($1,'Protected') returning id", ['delete-protected-' + relation])).rows[0].id;
    await db.exec('reset role');
    if (relation === 'orders') {
      await db.query("insert into public.orders(user_id,course_id,amount,transfer_code,status) values($1,$2,0,'DELETE_TEST','cancelled')", [alice, protectedId]);
    } else {
      await db.query("insert into public.enrollments(user_id,course_id,active,drive_status,drive_email) values($1,$2,false,'revoked','test@example.test')", [alice, protectedId]);
    }
    await assert.rejects(as(admin, 'delete from public.courses where id=$1', [protectedId]), (error) => error.code === '23503');
    assert.equal((await as(admin, 'select id from public.courses where id=$1', [protectedId])).rows.length, 1);
  }
});

test('Excel import is atomic, admin-only and requires thumbnail before publication', async () => {
  await db.exec('reset role');
  await db.exec(await readFile(new URL('../supabase/migrations/008_course_import.sql', import.meta.url), 'utf8'));
  const payload={course:{title:'Imported',category:'3D',level:'Cơ bản',price:200000,summary:'Intro',description:'Body'},modules:[{code:'C1',title:'Chapter'}],lessons:[{code:'B1',module:'C1',title:'Lesson',duration:10,video:'',body:'Text'}],resources:[{lesson:'B1',title:'File',url:'https://drive.google.com/file/d/ABC/view'}]};
  await assert.rejects(as(alice,'select public.admin_import_course(null,$1,$2)', ['student-import',payload]),/quản trị/);
  const id=(await as(admin,'select public.admin_import_course(null,$1,$2) as id',['excel-import',payload])).rows[0].id;
  assert.equal((await as(admin,'select published from public.courses where id=$1',[id])).rows[0].published,false);
  assert.equal((await as(admin,'select * from public.modules where course_id=$1',[id])).rows.length,1);
  await assert.rejects(as(admin,'update public.courses set published=true where id=$1',[id]),/ảnh đại diện/);
  await as(admin,"update public.courses set thumbnail_url='https://example.test/cover.png',published=true where id=$1",[id]);
  await assert.rejects(as(admin,"update public.courses set thumbnail_url='' where id=$1",[id]),/ảnh đại diện/);
  await as(admin,'update public.courses set published=false where id=$1',[id]);
  await assert.rejects(as(admin,'select public.admin_import_course($1,$2,$3)',[id,'unused',payload]),/đã có chương/);
  const invalid=structuredClone(payload);invalid.lessons[0].module='missing';
  await assert.rejects(as(admin,'select public.admin_import_course(null,$1,$2)',['rollback-import',invalid]));
  assert.equal((await as(admin,"select * from public.courses where slug='rollback-import'")).rows.length,0);
});

test('construction courses stay public but block checkout until released', async () => {
  await db.exec('reset role');
  await db.exec(await readFile(new URL('../supabase/migrations/009_course_construction.sql', import.meta.url), 'utf8'));
  const id=(await as(admin,"insert into public.courses(slug,title,published,under_construction,thumbnail_url) values('building-test','Building',true,true,'https://example.test/cover.png') returning id")).rows[0].id;
  assert.equal((await as(null,'select id from public.courses where id=$1',[id])).rows.length,1);
  assert.equal((await as(alice,'update public.courses set under_construction=false where id=$1 returning id',[id])).rows.length,0);
  await assert.rejects(as(alice,'select public.create_order($1)',[id]),/đang được xây dựng/);
  assert.equal((await as(admin,'select id from public.orders where course_id=$1',[id])).rows.length,0);
  await as(admin,'update public.courses set under_construction=false where id=$1',[id]);
  await as(alice,'select public.create_order($1)',[id]);
  await as(admin,'update public.courses set under_construction=true where id=$1',[id]);
  await assert.rejects(as(alice,'select public.create_order($1)',[id]),/đang được xây dựng/);
  assert.equal((await as(admin,'select id from public.orders where course_id=$1',[id])).rows.length,1);
  await as(admin,'update public.courses set published=false where id=$1',[id]);
  assert.equal((await as(null,'select id from public.courses where id=$1',[id])).rows.length,0);
});
