import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./dist/index.html', import.meta.url), 'utf8');
assert.match(html, /<h1>Ship a static site<\/h1>/);
for (const topic of ['Build', 'Test', 'Deploy']) {
  assert.ok(html.includes(`<li>${topic}</li>`), `Missing topic: ${topic}`);
}
console.log('Astro static output verified.');
