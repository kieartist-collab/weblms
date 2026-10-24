import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

test('email templates distinguish payment receipt and escape customer data', async () => {
  const source = await readFile(new URL('../supabase/functions/order-emails/templates.ts',import.meta.url),'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const {emailContent} = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const job = {order_id:'abc',audience:'customer',event:'pending',payload:{course_title:'<script>x</script>',amount:100,transfer_code:'HV123',bank_name:'BANK',bank_account:'123',bank_owner:'OWNER'}};
  const pending = emailContent(job,'https://example.test','S8 Space Academy');
  assert.match(pending.text,/đang chờ thanh toán/);
  assert.match(pending.text,/Nội dung chuyển khoản: HV123/);
  assert.ok(!pending.html.includes('<script>'));
  assert.match(pending.html,/https:\/\/example.test\/orders\/abc/);
  assert.match(emailContent({...job,event:'reported'},'https://example.test','S8 Space Academy').text,/chưa phải xác nhận/);
  assert.match(emailContent({...job,audience:'admin'},'https://example.test','S8 Space Academy').text,/\/admin\/orders/);
});

const users = ['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'];
async function emailDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;`);
  for (const file of ['001_lms.sql','012_order_emails.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url),'utf8'));
  for (const [i,id] of users.entries()) await db.query('insert into auth.users(id,email) values($1,$2)',[id,`user${i}@example.test`]);
  await db.query('update public.profiles set is_admin=true where id<>$1',[users[2]]);
  const course = (await db.query('select id from public.courses limit 1')).rows[0].id;
  return { db, course };
}

test('order email events, administrator recipients, permissions and retry leases', async () => {
  const { db, course } = await emailDatabase();
  try {
    const order = (await db.query("insert into public.orders(user_id,course_id,amount,transfer_code) values($1,$2,100,'TEST') returning id",[users[2],course])).rows[0].id;
    assert.equal((await db.query('select * from public.order_emails')).rows.length,3);
    await db.query("update public.orders set status='pending' where id=$1",[order]);
    assert.equal((await db.query('select * from public.order_emails')).rows.length,3);
    await db.query("update public.orders set status='reported' where id=$1",[order]);
    assert.equal((await db.query('select * from public.order_emails')).rows.length,6);
    await db.query('update public.profiles set is_admin=false where id=$1',[users[1]]);
    const claimed = (await db.query('select * from public.claim_order_emails()')).rows;
    assert.equal(claimed.length,4);
    assert.ok(claimed.every(j => j.recipient_id!==users[1] && j.attempts===1));
    assert.equal((await db.query('select * from public.claim_order_emails()')).rows.length,0);
    await db.exec("update public.order_emails set locked_at=now()-interval '6 minutes' where status='processing'");
    const reclaimed = (await db.query('select * from public.claim_order_emails()')).rows;
    assert.equal(reclaimed.length,4);
    assert.notEqual(reclaimed[0].lock_token, claimed.find(j => j.id===reclaimed[0].id).lock_token);
    await db.exec("update public.order_emails set locked_at=now()-interval '6 minutes',first_attempt_at=now()-interval '24 hours' where status='processing'");
    assert.equal((await db.query('select * from public.claim_order_emails()')).rows.length,0);
    assert.equal((await db.query("select * from public.order_emails where status='failed'")).rows.length,4);
    await db.query("update public.orders set status='paid' where id=$1",[order]);
    await db.query("update public.orders set status='fulfilled' where id=$1",[order]);
    assert.equal((await db.query("select * from public.order_emails where event in ('paid','fulfilled')")).rows.length,2);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[2]]);
    assert.equal((await db.query('select * from public.order_emails')).rows.length,0);
    await assert.rejects(db.query('select * from public.claim_order_emails()'),/permission denied/);
    await assert.rejects(db.query('select public.admin_retry_order_email($1)',[claimed[0].id]),/Chỉ admin/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[0]]);
    assert.equal((await db.query('select * from public.order_emails')).rows.length,8);
    await assert.rejects(db.query('select public.admin_retry_order_email($1)',[claimed[0].id]),/Không thể gửi lại/);
  } finally { await db.close(); }
});

test('email queue problems never block orders and invalid addresses are skipped', async () => {
  const { db, course } = await emailDatabase();
  try {
    await db.query("update public.profiles set email='' where id=$1",[users[2]]);
    const order = (await db.query("insert into public.orders(user_id,course_id,amount,transfer_code) values($1,$2,100,'EMPTY') returning id",[users[2],course])).rows[0].id;
    const rows = (await db.query('select audience,status,last_error from public.order_emails where order_id=$1 order by audience',[order])).rows;
    assert.deepEqual(rows.map(r => [r.audience,r.status]),[['admin','pending'],['admin','pending'],['customer','skipped']]);
    assert.match(rows[2].last_error,/email hợp lệ/);
    assert.equal((await db.query('select * from public.claim_order_emails()')).rows.every(j => j.audience==='admin'),true);

    await db.exec('alter table public.order_emails add constraint reject_all check(false) not valid');
    await db.query("update public.orders set status='reported' where id=$1",[order]);
    assert.equal((await db.query('select status from public.orders where id=$1',[order])).rows[0].status,'reported');
    assert.equal((await db.query("select * from public.order_emails where event='reported'")).rows.length,0);
  } finally { await db.close(); }
});
