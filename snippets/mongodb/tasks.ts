import type { Collection } from 'mongodb';
import { ObjectId } from 'mongodb';

export interface Task {
  _id: ObjectId;
  tenantId: string;
  slug: string;
  title: string;
  completed: boolean;
  revision: number;
  createdAt: Date;
}

function key(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[a-z0-9-]{1,64}$/.test(value)) {
    throw new TypeError(`${label} must be 1-64 lowercase letters, digits, or hyphens.`);
  }
  return value;
}

function taskId(value: unknown): ObjectId {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) {
    throw new TypeError('Task ID must be a 24-character hexadecimal string.');
  }
  return new ObjectId(value);
}

export class TaskConflictError extends Error {
  constructor() {
    super('The task is unavailable in this tenant or its revision has changed.');
    this.name = 'TaskConflictError';
  }
}

export async function createTask(
  tasks: Collection<Task>,
  trustedTenantId: string,
  slug: unknown,
  title: unknown,
): Promise<Task> {
  if (typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
    throw new TypeError('Title must be a nonblank string of at most 120 UTF-16 code units.');
  }
  const task: Task = {
    _id: new ObjectId(),
    tenantId: key(trustedTenantId, 'Tenant ID'),
    slug: key(slug, 'Slug'),
    title: title.trim(),
    completed: false,
    revision: 0,
    createdAt: new Date(),
  };
  await tasks.insertOne(task);
  return task;
}

export async function findTask(tasks: Collection<Task>, trustedTenantId: string, id: unknown) {
  return tasks.findOne({ tenantId: key(trustedTenantId, 'Tenant ID'), _id: taskId(id) });
}

export async function listRecentTasks(
  tasks: Collection<Task>,
  trustedTenantId: string,
  limit = 20,
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new TypeError('Page size must be an integer between 1 and 50.');
  }
  return tasks
    .find({ tenantId: key(trustedTenantId, 'Tenant ID') })
    .sort({ _id: -1 })
    .limit(limit)
    .maxTimeMS(2_000)
    .toArray();
}

export async function setCompleted(
  tasks: Collection<Task>,
  trustedTenantId: string,
  id: unknown,
  expectedRevision: number,
  completed: unknown,
): Promise<Task> {
  if (
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0 ||
    expectedRevision >= 2_147_483_647
  ) {
    throw new TypeError('Expected revision must be a nonnegative int32 with room to increment.');
  }
  if (typeof completed !== 'boolean') {
    throw new TypeError('Completed must be a boolean.');
  }
  const updated = await tasks.findOneAndUpdate(
    { tenantId: key(trustedTenantId, 'Tenant ID'), _id: taskId(id), revision: expectedRevision },
    { $set: { completed }, $inc: { revision: 1 } },
    { returnDocument: 'after', includeResultMetadata: false },
  );
  if (!updated) throw new TaskConflictError();
  return updated;
}
