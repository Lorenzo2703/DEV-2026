import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { parseDocument } from 'yaml';

async function frontmatter(file: string): Promise<Record<string, unknown>> {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/.exec(source);
  assert.ok(match, `${file}: expected frontmatter and a nonempty body`);
  const document = parseDocument(match[1] ?? '');
  assert.deepEqual(document.errors, [], `${file}: invalid YAML`);
  const value: unknown = document.toJS();
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
  const fields: Record<string, unknown> = Object.fromEntries(Object.entries(value));
  for (const field of ['name', 'description']) {
    assert.ok(typeof fields[field] === 'string' && fields[field].trim().length > 0);
  }
  return fields;
}

test('legacy prompt metadata uses a named agent and a valid command name', async () => {
  const fields = await frontmatter('feature.prompt.md');
  assert.match(String(fields.name), /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(fields.agent, 'agent');
  assert.equal(typeof fields['argument-hint'], 'string');
});

test('skill metadata matches its directory and disables automatic invocation', async () => {
  const directory = 'plan-feature';
  const fields = await frontmatter(`${directory}/SKILL.md`);
  assert.equal(fields.name, directory);
  assert.equal(fields['disable-model-invocation'], true);
});
