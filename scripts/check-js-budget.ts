import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const distRoot = resolve('dist');
const htmlFiles: string[] = [];

async function findHtml(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await findHtml(path);
    } else if (entry.isFile() && extname(path) === '.html') {
      htmlFiles.push(path);
    }
  }
}

await findHtml(distRoot);
const failures: string[] = [];
const budgetBytes = 30 * 1024;
if (htmlFiles.length === 0) {
  throw new Error('No built HTML pages were found under dist/.');
}

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const assets = new Set<string>();
  let totalBytes = 0;

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attributes = match[1] ?? '';
    const source = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (source) {
      const url = new URL(source, 'https://site.invalid');
      if (url.origin !== 'https://site.invalid') {
        failures.push(
          `${relative(distRoot, htmlFile)}: external JavaScript is outside the local budget check.`,
        );
        continue;
      }

      const assetPath = resolve(distRoot, `.${decodeURIComponent(url.pathname)}`);
      if (!assetPath.startsWith(`${distRoot}${sep}`)) {
        failures.push(`${relative(distRoot, htmlFile)}: script path escapes the built site.`);
        continue;
      }
      assets.add(assetPath);
    } else {
      totalBytes += gzipSync(match[2] ?? '').byteLength;
    }
  }

  for (const asset of assets) {
    totalBytes += gzipSync(await readFile(asset)).byteLength;
  }

  if (totalBytes > budgetBytes) {
    failures.push(
      `${relative(distRoot, htmlFile)}: ${totalBytes} gzipped JS bytes exceed ${budgetBytes}.`,
    );
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `JavaScript budget passed for ${htmlFiles.length} page(s) (<= ${budgetBytes} gzipped bytes each).`,
  );
}
