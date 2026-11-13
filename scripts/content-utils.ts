import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { parse } from 'yaml';

export type { StaleStatus } from '../src/lib/staleness';
export { getStaleStatus } from '../src/lib/staleness';

export interface ParsedContent {
  data: Record<string, unknown>;
  body: string;
}

const toolFields = [
  'title',
  'summary',
  'category',
  'maturity',
  'radar',
  'toolVersion',
  'verifiedAt',
  'officialDocs',
  'license',
  'pricing',
  'difficulty',
] as const;

const toolHeadings = [
  'what it is',
  'prerequisites and versions',
  'install and minimal setup',
  'correct implementation',
  'integrate with the rest of the stack',
  'test it',
  'security and performance',
  'common mistakes',
  'observability',
  'upgrade and migration notes',
  'alternatives',
  'sources',
];

const toolEnums: Record<string, readonly string[]> = {
  category: [
    'languages-runtimes',
    'package-management',
    'frontend',
    'styling-ui',
    'build-quality',
    'testing',
    'backend-apis',
    'auth',
    'data',
    'ai-dev',
    'analytics',
    'observability',
    'ci-cd',
    'security',
    'deployment',
    'iac-platform',
  ],
  maturity: ['frontier', 'stable', 'legacy', 'deprecated'],
  radar: ['adopt', 'trial', 'assess', 'hold'],
  pricing: ['free', 'free-tier', 'paid', 'mixed'],
  difficulty: ['beginner', 'intermediate', 'advanced'],
};

export function parseFrontmatter(source: string): ParsedContent {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) {
    throw new Error('Missing YAML frontmatter delimiters.');
  }

  const parsed: unknown = parse(match[1] ?? '', {
    customTags: ['timestamp'],
    merge: true,
    schema: 'core',
  });
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Frontmatter must be a YAML object.');
  }

  return {
    data: parsed as Record<string, unknown>,
    body: source.slice(match[0].length),
  };
}

export function validateToolFrontmatter(data: Record<string, unknown>): string[] {
  const issues: string[] = [];
  for (const field of toolFields) {
    if (!(field in data)) issues.push(`Missing required frontmatter field "${field}".`);
  }
  for (const field of ['title', 'summary', 'toolVersion', 'license']) {
    if (typeof data[field] !== 'string') issues.push(`"${field}" must be a string.`);
  }
  if (typeof data.summary === 'string' && data.summary.length > 200) {
    issues.push('"summary" must be at most 200 characters.');
  }
  for (const [field, values] of Object.entries(toolEnums)) {
    if (typeof data[field] !== 'string' || !values.includes(data[field])) {
      issues.push(`"${field}" must be one of: ${values.join(', ')}.`);
    }
  }
  for (const field of ['officialDocs', 'repo']) {
    const value = data[field];
    if (value === undefined && field === 'repo') continue;
    if (typeof value !== 'string' || !isHttpUrl(value)) {
      issues.push(`"${field}" must be an HTTP(S) URL.`);
    }
  }
  if (!isValidDate(data.verifiedAt)) {
    issues.push('"verifiedAt" must be a valid date.');
  } else if (new Date(data.verifiedAt) > new Date()) {
    issues.push('"verifiedAt" cannot be in the future.');
  }
  for (const field of ['alternatives', 'related', 'tags']) {
    const value = data[field];
    if (
      value !== undefined &&
      (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))
    ) {
      issues.push(`"${field}" must be an array of strings.`);
    }
  }
  for (const field of ['needsVerification', 'draft']) {
    const value = data[field];
    if (value !== undefined && typeof value !== 'boolean') {
      issues.push(`"${field}" must be a boolean.`);
    }
  }
  return issues;
}

export function validateToolHeadings(body: string): string[] {
  const headings = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) =>
    (match[1] ?? '').toLowerCase(),
  );
  const issues: string[] = [];
  let nextHeadingIndex = 0;
  for (const requiredHeading of toolHeadings) {
    const foundIndex = headings.findIndex(
      (heading, index) => index >= nextHeadingIndex && heading.includes(requiredHeading),
    );
    if (foundIndex < 0) {
      issues.push(`Missing or out-of-order heading "${requiredHeading}".`);
    } else {
      nextHeadingIndex = foundIndex + 1;
    }
  }
  return issues;
}

export function getSnippetReferences(body: string): string[] {
  return [...body.matchAll(/snippets\/([^\s)`"'<>]+)/g)].map(
    (match) => (match[1] ?? '').replace(/[.,;:]$/, '').split(/[?#]/, 1)[0] ?? '',
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDate(value: unknown): value is string | Date {
  return (
    (typeof value === 'string' || value instanceof Date) && !Number.isNaN(new Date(value).getTime())
  );
}

export async function listMarkdownFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && ['.md', '.mdx'].includes(extname(entry.name))) {
        files.push(path);
      }
    }
  }

  await visit(root);
  return files.sort();
}

export async function readContentFile(path: string): Promise<ParsedContent> {
  return parseFrontmatter(await readFile(path, 'utf8'));
}

export function contentId(path: string, root: string): string {
  return relative(root, path).replaceAll('\\', '/');
}
