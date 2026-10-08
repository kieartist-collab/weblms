import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('public instructor directory exposes only current admin names without account data', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table public.profiles(id int primary key,full_name text,email text,is_admin boolean);
      alter table public.profiles enable row level security;
      insert into public.profiles values(1,'Teacher','private@example.test',true),(2,'Student','student@example.test',false);
    `);
    await db.exec(
      await readFile(
        new URL('../supabase/migrations/007_public_instructors.sql', import.meta.url),
        'utf8',
      ),
    );
    await db.exec('set role anon');
    assert.deepEqual((await db.query('select * from public.list_public_instructors()')).rows, [
      { full_name: 'Teacher' },
    ]);
    await assert.rejects(db.query('select email from public.profiles'), /permission denied/);
    await db.exec(
      'reset role; update public.profiles set is_admin=false where id=1; update public.profiles set is_admin=true where id=2; set role authenticated;',
    );
    assert.deepEqual((await db.query('select * from public.list_public_instructors()')).rows, [
      { full_name: 'Student' },
    ]);
  } finally {
    await db.close();
  }
});
