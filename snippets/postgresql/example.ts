import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = await PGlite.create();
try {
  const migration = await readFile(new URL('./001_create_tasks.sql', import.meta.url), 'utf8');
  await db.exec(migration);

  const title = "Review O'Reilly's guide";
  await db.query('INSERT INTO tasks (title) VALUES ($1)', [title]);
  const result = await db.query<{ title: string; completed: boolean }>(
    'SELECT title, completed FROM tasks WHERE title = $1',
    [title],
  );
  assert.deepEqual(result.rows, [{ title, completed: false }]);

  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.query('INSERT INTO tasks (title) VALUES ($1)', ['Rolled back']);
      throw new Error('Cancel transaction');
    }),
    /Cancel transaction/,
  );
  const remaining = await db.query('SELECT title FROM tasks WHERE title = $1', ['Rolled back']);
  assert.equal(remaining.rows.length, 0);
} finally {
  await db.close();
}
console.log('Parameterized query and rollback verified.');
