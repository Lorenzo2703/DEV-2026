import { existsSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  contentId,
  getSnippetReferences,
  getStaleStatus,
  listMarkdownFiles,
  readContentFile,
  validateToolFrontmatter,
  validateToolHeadings,
} from './content-utils';

const root = resolve('src/content');
const files = await listMarkdownFiles(root);
const failures: string[] = [];
const stalePages: string[] = [];

for (const file of files) {
  try {
    const { data, body } = await readContentFile(file);
    const id = contentId(file, root);
    if (typeof data.title !== 'string' || typeof data.summary !== 'string') {
      failures.push(`${id}: title and summary must be strings.`);
    }

    if (id.startsWith('tools/')) {
      failures.push(...validateToolFrontmatter(data).map((issue) => `${id}: ${issue}`));
      failures.push(...validateToolHeadings(body).map((issue) => `${id}: ${issue}`));

      if (typeof data.verifiedAt === 'string' || data.verifiedAt instanceof Date) {
        const verifiedAt = new Date(data.verifiedAt);
        const status = getStaleStatus(
          verifiedAt,
          typeof data.maturity === 'string' ? data.maturity : '',
        );
        if (status.stale) {
          stalePages.push(
            `${id}: ${status.ageInDays} days old (limit ${status.reviewWindowDays}).`,
          );
        }
      }
    }

    for (const snippetPath of getSnippetReferences(body)) {
      const snippetRoot = resolve('snippets');
      const target = resolve(snippetRoot, snippetPath);
      const pathFromRoot = relative(snippetRoot, target);
      if (isAbsolute(pathFromRoot) || pathFromRoot.startsWith('..')) {
        failures.push(`${id}: snippet reference escapes the snippets directory: ${snippetPath}.`);
      } else if (!existsSync(join(snippetRoot, snippetPath))) {
        failures.push(`${id}: referenced snippet does not exist: snippets/${snippetPath}.`);
      }
    }
  } catch (error) {
    failures.push(
      `${contentId(file, root)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(`Checked ${files.length} content file(s).`);
console.log(stalePages.length ? `Stale pages:\n${stalePages.join('\n')}` : 'No stale tool pages.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
