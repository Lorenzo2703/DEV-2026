import { describe, expect, it } from 'vitest';
import { parseRelease } from './releases';

describe('parseRelease', () => {
  it('extracts stable npm, GitHub, and PostgreSQL versions', () => {
    expect(parseRelease({ kind: 'npm', package: 'example' }, { version: '2.0.0' })).toBe('2.0.0');
    expect(
      parseRelease(
        { kind: 'github', repository: 'x/y', tagPrefix: 'bun-v' },
        { tag_name: 'bun-v1.2.3', prerelease: false },
      ),
    ).toBe('1.2.3');
    expect(
      parseRelease({ kind: 'postgres' }, [
        { current: false },
        { current: true, major: '18', latestMinor: '7' },
      ]),
    ).toBe('18.7');
  });

  it('rejects malformed, ambiguous, and prerelease responses', () => {
    expect(() => parseRelease({ kind: 'npm', package: 'example' }, {})).toThrow();
    expect(() =>
      parseRelease(
        { kind: 'github', repository: 'x/y', tagPrefix: 'v' },
        { tag_name: 'v1', prerelease: true },
      ),
    ).toThrow();
    expect(() =>
      parseRelease({ kind: 'postgres' }, [{ current: true }, { current: true }]),
    ).toThrow();
  });
});
