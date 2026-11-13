import type { Db } from 'mongodb';
import type { Task } from './tasks.ts';

export async function createTaskCollection(db: Db) {
  const tasks = await db.createCollection<Task>('tasks', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: false,
        required: ['_id', 'tenantId', 'slug', 'title', 'completed', 'revision', 'createdAt'],
        properties: {
          _id: { bsonType: 'objectId' },
          tenantId: { bsonType: 'string', pattern: '^[a-z0-9-]{1,64}$' },
          slug: { bsonType: 'string', pattern: '^[a-z0-9-]{1,64}$' },
          title: { bsonType: 'string', minLength: 1, maxLength: 120, pattern: '\\S' },
          completed: { bsonType: 'bool' },
          revision: { bsonType: 'int', minimum: 0 },
          createdAt: { bsonType: 'date' },
        },
      },
    },
    validationLevel: 'strict',
    validationAction: 'error',
  });
  await tasks.createIndex(
    { tenantId: 1, slug: 1 },
    { unique: true, name: 'tenant_slug_unique' },
    { maxTimeMS: 5_000 },
  );
  await tasks.createIndex(
    { tenantId: 1, _id: -1 },
    { name: 'tenant_recent' },
    { maxTimeMS: 5_000 },
  );
  return tasks;
}
