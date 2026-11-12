import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { delimiter, resolve } from 'node:path';

for (const manager of ['bun', 'npm', 'pnpm', 'yarn']) {
  const command = (
    await readFile(new URL(`./commands/${manager}.txt`, import.meta.url), 'utf8')
  ).trim();
  assert.equal(command, `${manager} run verify`);
  const executable = manager === 'pnpm' || manager === 'yarn' ? 'node' : manager;
  const args =
    manager === 'pnpm'
      ? [resolve('../../node_modules/pnpm/bin/pnpm.mjs'), 'run', 'verify']
      : manager === 'yarn'
        ? [resolve('../../node_modules/yarn/bin/yarn.js'), 'run', 'verify']
        : ['run', 'verify'];
  const cwd = manager === 'pnpm' ? resolve('../pnpm') : undefined;
  const result = spawnSync(executable, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PATH: `${resolve('../../node_modules/.bin')}${delimiter}${process.env.PATH}`,
      ...(manager === 'yarn' ? { SKIP_YARN_COREPACK_CHECK: '1' } : {}),
    },
  });
  if (result.error) throw new Error(`Could not start ${manager}: ${result.error.message}`);
  if (result.status !== 0)
    throw new Error(`${manager} command failed with status ${result.status}.`);
}
