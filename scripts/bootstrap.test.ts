import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const template = readFileSync(join('src', 'lib', 'bootstrap-template.cjs'), 'utf8');
const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function runBootstrap(backend: string | undefined, name = 'example') {
  const directory = mkdtempSync(join(tmpdir(), 'stack-bootstrap-test-'));
  directories.push(directory);
  const config = {
    scope: 'API service',
    primary: backend ? { backend } : {},
    roles: [
      {
        id: 'database',
        title: 'Database',
        tools: [{ id: 'data/qdrant', title: 'Qdrant', url: 'https://example.test/tools/data/qdrant/' }],
      },
    ],
  };
  const script = join(directory, 'bootstrap.cjs');
  writeFileSync(script, template.replace('__STACK_CONFIG__', JSON.stringify(config)));
  const run = () => spawnSync(process.execPath, [script, name], { cwd: directory, encoding: 'utf8' });
  return { directory, run };
}

describe('bootstrap script', () => {
  it.each([
    ['backend-apis/fastapi', 'backend/main.py', 'fastapi dev main.py'],
    ['backend-apis/fastify', 'backend/server.mjs', 'npm start'],
    ['backend-apis/spring-boot', 'backend/pom.xml', 'mvn spring-boot:run'],
  ])('creates a %s starter and documents manual choices', (backend, file, start) => {
    const { directory, run } = runBootstrap(backend);
    const result = run();
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(directory, 'example', file), 'utf8')).not.toBe('');
    const readme = readFileSync(join(directory, 'example', 'README.md'), 'utf8');
    expect(readme).toContain(start);
    expect(readme).toContain('https://example.test/tools/data/qdrant/');
    expect(readme).toContain('not automatically integrated');
    expect(run().status).not.toBe(0);
    expect(readFileSync(join(directory, 'example', 'README.md'), 'utf8')).toBe(readme);
  });

  it('creates instructions without inventing a framework and rejects unsafe names', () => {
    const noFramework = runBootstrap(undefined);
    expect(noFramework.run().status).toBe(0);
    expect(readFileSync(join(noFramework.directory, 'example', 'README.md'), 'utf8')).toContain(
      'No frontend or API framework was selected',
    );
    expect(runBootstrap(undefined, '../escape').run().status).not.toBe(0);
  });
});
