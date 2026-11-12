import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('normalizes surrounding and repeated whitespace', () => {
    expect(slugify('  Release   Notes  ')).toBe('release-notes');
  });

  it('rejects a blank title', () => {
    expect(() => slugify('  ')).toThrow('A title is required.');
  });
});
