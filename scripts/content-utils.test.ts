import { describe, expect, it } from 'vitest';
import {
  getSnippetReferences,
  getStaleStatus,
  parseFrontmatter,
  validateToolFrontmatter,
  validateToolHeadings,
} from './content-utils';

describe('parseFrontmatter', () => {
  it('returns parsed data and the body', () => {
    expect(parseFrontmatter('---\ntitle: Guide\n---\n## Setup').data.title).toBe('Guide');
    expect(parseFrontmatter('---\ntitle: Guide\n---\n## Setup').body).toBe('## Setup');
  });

  it('rejects missing delimiters and non-object YAML', () => {
    expect(() => parseFrontmatter('# no frontmatter')).toThrow('Missing YAML frontmatter');
    expect(() => parseFrontmatter('---\n- item\n---\nbody')).toThrow(
      'Frontmatter must be a YAML object',
    );
  });
});

describe('getStaleStatus', () => {
  const today = new Date('2026-11-12T00:00:00.000Z');

  it('uses the shorter review window for frontier tools', () => {
    expect(getStaleStatus(new Date('2026-09-27T00:00:00.000Z'), 'frontier', today).stale).toBe(
      true,
    );
    expect(getStaleStatus(new Date('2026-09-27T00:00:00.000Z'), 'stable', today).stale).toBe(false);
  });

  it('marks a page stale as soon as its review window is exceeded', () => {
    for (const [maturity, days] of [
      ['frontier', 45],
      ['stable', 90],
    ] as const) {
      const boundary = new Date(today.getTime() - days * 86_400_000);
      expect(getStaleStatus(boundary, maturity, today).stale).toBe(false);
      expect(getStaleStatus(new Date(boundary.getTime() - 1), maturity, today).stale).toBe(true);
    }
  });
});

describe('tool content validation', () => {
  const validTool = {
    title: 'Example',
    summary: 'A practical example.',
    category: 'testing',
    maturity: 'stable',
    radar: 'adopt',
    toolVersion: '1.0.0',
    verifiedAt: '2026-11-12',
    officialDocs: 'https://example.com/docs',
    license: 'MIT',
    pricing: 'free',
    difficulty: 'beginner',
  };
  const headings = [
    'What it is, when to use it, when not to',
    'Prerequisites and versions',
    'Install and minimal setup',
    'Correct implementation',
    'Integrate with the rest of the stack',
    'Test it',
    'Security and performance',
    'Common mistakes',
    'Observability',
    'Upgrade and migration notes',
    'Alternatives',
    'Sources',
  ]
    .map((heading) => `## ${heading}`)
    .join('\n');

  it('accepts valid tool metadata and ordered headings', () => {
    expect(validateToolFrontmatter(validTool)).toEqual([]);
    expect(validateToolHeadings(headings)).toEqual([]);
  });

  it('requires date-shaped tool versions to be quoted, matching Astro parsing', () => {
    const unquoted = parseFrontmatter(
      '---\ntoolVersion: 2026-07-28\nverifiedAt: 2026-11-12\n---\n',
    ).data;
    expect(unquoted.verifiedAt).toBeInstanceOf(Date);
    expect(validateToolFrontmatter({ ...validTool, ...unquoted })).toEqual([
      '"toolVersion" must be a string.',
    ]);

    const quoted = parseFrontmatter('---\ntoolVersion: "2026-07-28"\n---\n').data;
    expect(quoted.toolVersion).toBe('2026-07-28');
    expect(validateToolFrontmatter({ ...validTool, ...quoted })).toEqual([]);
  });

  it('rejects invalid metadata and missing/out-of-order sections', () => {
    expect(
      validateToolFrontmatter({ ...validTool, summary: 'x'.repeat(201), radar: 'maybe' }),
    ).toEqual(
      expect.arrayContaining([
        '"summary" must be at most 200 characters.',
        '"radar" must be one of: adopt, trial, assess, hold.',
      ]),
    );
    expect(validateToolHeadings('## Sources\n## What it is')).toContain(
      'Missing or out-of-order heading "prerequisites and versions".',
    );
    expect(validateToolFrontmatter({ ...validTool, verifiedAt: '2027-01-01' })).toContain(
      '"verifiedAt" cannot be in the future.',
    );
  });

  it('extracts snippet paths without query parameters', () => {
    expect(getSnippetReferences('`snippets/bun/example.ts?raw`')).toEqual(['bun/example.ts']);
  });
});
