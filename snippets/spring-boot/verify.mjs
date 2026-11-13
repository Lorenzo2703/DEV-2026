import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const goal = process.argv[2];
if (goal !== 'package' && goal !== 'test') {
  throw new Error('Expected a Maven package or test goal.');
}
const args = ['--batch-mode', '--no-transfer-progress'];
if (goal === 'package') args.push('-DskipTests');
args.push(goal);
const windows = process.platform === 'win32';
const result = spawnSync(
  windows ? 'cmd.exe' : 'sh',
  windows ? ['/d', '/s', '/c', `mvnw.cmd ${args.join(' ')}`] : ['./mvnw', ...args],
  { cwd: fileURLToPath(new URL('.', import.meta.url)), stdio: 'inherit' },
);
if (result.error) throw result.error;
if (result.status === null) throw new Error(`Maven terminated with signal ${result.signal}.`);
process.exitCode = result.status;
