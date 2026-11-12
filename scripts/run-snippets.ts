import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface SnippetManifest {
  scripts?: Record<string, string>;
}

const root = join(process.cwd(), 'snippets');
const entries = await readdir(root, { withFileTypes: true });
const directories = entries.filter((entry) => entry.isDirectory());
let executed = 0;

for (const directory of directories) {
  const snippetRoot = join(root, directory.name);
  const manifestPath = join(snippetRoot, 'package.json');
  let manifest: SnippetManifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as SnippetManifest;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      continue;
    }
    throw new Error(`${directory.name}: could not read package.json: ${String(error)}`);
  }

  for (const script of ['typecheck', 'run']) {
    if (!manifest.scripts?.[script]) {
      throw new Error(`${directory.name}/package.json must define a "${script}" script.`);
    }
    const result = spawnSync('bun', ['run', script], {
      cwd: snippetRoot,
      stdio: 'inherit',
    });
    if (result.error) {
      throw new Error(`${directory.name}: could not start "bun run ${script}": ${result.error}`);
    }
    if (result.status !== 0) {
      throw new Error(`${directory.name}: "bun run ${script}" failed with ${result.status}.`);
    }
  }
  executed += 1;
}

console.log(
  executed
    ? `Type-checked and ran ${executed} snippet package(s).`
    : 'No snippet packages found; nothing to type-check or run.',
);
