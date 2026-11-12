import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const html = await readFile(new URL('./dist/index.html', import.meta.url), 'utf8');
assert.match(html, /class="bg-ocean p-4 text-white"/);
const assets = new URL('./dist/_astro/', import.meta.url);
const cssFile = (await readdir(assets)).find((file) => file.endsWith('.css'));
assert.ok(cssFile, 'Expected generated CSS');
const css = await readFile(new URL(cssFile, assets), 'utf8');
assert.match(css, /\.bg-ocean/);
assert.match(css, /--color-ocean/);
console.log('Tailwind generated the theme utility.');
