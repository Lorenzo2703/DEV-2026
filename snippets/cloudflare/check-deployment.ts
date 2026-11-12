import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const result = spawnSync('node', [cli, 'deploy', '--dry-run'], {
  cwd: fileURLToPath(new URL('.', import.meta.url)),
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Wrangler dry run failed: ${result.status}`);
console.log('Wrangler configuration passed a dry run.');
