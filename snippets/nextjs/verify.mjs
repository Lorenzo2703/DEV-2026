import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('./out/index.html', import.meta.url), 'utf8');
assert.match(page, /Deployment checklist/);
assert.match(page, /Verify your build before publishing/);
console.log('Next.js static page verified.');
