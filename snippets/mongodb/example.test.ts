import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Collection, MongoClient } from 'mongodb';
import { MongoServerError } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { createClient } from './client.ts';
import { createTaskCollection } from './schema.ts';
import type { Task } from './tasks.ts';
import { createTask, findTask, listRecentTasks, setCompleted, TaskConflictError } from './tasks.ts';

let server: MongoMemoryServer | undefined;
let client: MongoClient | undefined;
let tasks: Collection<Task>;

before(async () => {
  server = await MongoMemoryServer.create({
    binary: { version: '9.0.8', checkMD5: true },
    instance: { ip: '127.0.0.1', storageEngine: 'wiredTiger' },
  });
  client = createClient(server.getUri());
  await client.connect();
  const db = client.db('handbook_test');
  const build = await db.command({ buildInfo: 1 });
  assert.equal(build.version, '9.0.8');
  tasks = await createTaskCollection(db);
});

after(async () => {
  try {
    await client?.close();
  } finally {
    await server?.stop();
  }
});

test('creates, reads, updates, and reads back the task in the trusted tenant', async () => {
  const task = await createTask(tasks, 'tenant-a', 'welcome', '  Welcome  ');
  const stored = await findTask(tasks, 'tenant-a', task._id.toHexString());
  assert.equal(stored?.title, 'Welcome');
  assert.equal(stored?.revision, 0);
  const updated = await setCompleted(tasks, 'tenant-a', task._id.toHexString(), 0, true);
  assert.equal(updated.completed, true);
  assert.equal(updated.revision, 1);
  assert.equal((await findTask(tasks, 'tenant-a', task._id.toHexString()))?.completed, true);
});

test('compound uniqueness rejects duplicate slugs within a tenant, not across tenants', async () => {
  await createTask(tasks, 'tenant-unique-a', 'same-slug', 'First');
  await assert.rejects(
    createTask(tasks, 'tenant-unique-a', 'same-slug', 'Duplicate'),
    (error: unknown) => error instanceof MongoServerError && error.code === 11000,
  );
  await createTask(tasks, 'tenant-unique-b', 'same-slug', 'Independent');
  assert.equal(await tasks.countDocuments({ slug: 'same-slug' }), 2);
});

test('tenant-scoped reads and writes do not disclose or modify another tenant task', async () => {
  const task = await createTask(tasks, 'tenant-private', 'private', 'Private task');
  assert.equal(await findTask(tasks, 'tenant-other', task._id.toHexString()), null);
  await assert.rejects(
    setCompleted(tasks, 'tenant-other', task._id.toHexString(), 0, true),
    TaskConflictError,
  );
  const unchanged = await findTask(tasks, 'tenant-private', task._id.toHexString());
  assert.equal(unchanged?.revision, 0);
  assert.equal(unchanged?.completed, false);
});

test('two concurrent writes with the same expected revision have exactly one winner', async () => {
  const task = await createTask(tasks, 'tenant-race', 'race', 'Concurrent task');
  const outcomes = await Promise.allSettled([
    setCompleted(tasks, 'tenant-race', task._id.toHexString(), 0, true),
    setCompleted(tasks, 'tenant-race', task._id.toHexString(), 0, false),
  ]);
  assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = outcomes.find((result) => result.status === 'rejected');
  assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof TaskConflictError);
  assert.equal((await findTask(tasks, 'tenant-race', task._id.toHexString()))?.revision, 1);
});

test('the database validator rejects invalid BSON and extra fields even when the helper is bypassed', async () => {
  const valid = await createTask(tasks, 'tenant-schema', 'valid', 'Valid document');
  assert.ok(client);
  const rawCollection = client.db('handbook_test').collection('tasks');
  for (const mutation of [
    { title: '' },
    { title: '   ' },
    { title: 'x'.repeat(121) },
    { completed: 'true' },
    { revision: -1 },
    { revision: 0.5 },
    { tenantId: { $ne: '' } },
    { unexpected: 'not in the schema' },
  ]) {
    await assert.rejects(
      rawCollection.updateOne({ _id: valid._id }, { $set: mutation }),
      (error: unknown) => error instanceof MongoServerError && error.code === 121,
    );
  }
  assert.equal((await tasks.findOne({ _id: valid._id }))?.revision, 0);
});

test('input guards reject operator-shaped values, malformed IDs, and invalid update values', async () => {
  await assert.rejects(createTask(tasks, 'tenant-input', { $ne: '' }, 'Title'), TypeError);
  await assert.rejects(createTask(tasks, 'tenant-input', 'slug', { $gt: '' }), TypeError);
  await assert.rejects(findTask(tasks, 'tenant-input', { $ne: null }), TypeError);
  await assert.rejects(findTask(tasks, 'tenant-input', 'not-an-id'), TypeError);
  const task = await createTask(tasks, 'tenant-input', 'boundary', 'x'.repeat(120));
  await assert.rejects(createTask(tasks, 'tenant-input', 'too-long', 'x'.repeat(121)), TypeError);
  await assert.rejects(
    setCompleted(tasks, 'tenant-input', task._id.toHexString(), 0, 'true'),
    TypeError,
  );
  await assert.rejects(
    setCompleted(tasks, 'tenant-input', task._id.toHexString(), -1, true),
    TypeError,
  );
});

test('lists a bounded deterministic page without mixing tenants', async () => {
  const first = await createTask(tasks, 'tenant-list', 'first', 'First');
  const second = await createTask(tasks, 'tenant-list', 'second', 'Second');
  await createTask(tasks, 'tenant-list-other', 'other', 'Other');
  const page = await listRecentTasks(tasks, 'tenant-list', 1);
  assert.equal(page.length, 1);
  assert.equal(page[0]?._id.toHexString(), second._id.toHexString());
  const all = await listRecentTasks(tasks, 'tenant-list');
  assert.deepEqual(
    all.map((task) => task._id.toHexString()),
    [second._id.toHexString(), first._id.toHexString()],
  );
  for (const limit of [0, 51, 1.5, Number.NaN]) {
    await assert.rejects(listRecentTasks(tasks, 'tenant-list', limit), TypeError);
  }
});
