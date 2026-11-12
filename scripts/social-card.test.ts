import { expect, it } from 'vitest';
import { socialCardSvg } from '../src/lib/social-card';

it('escapes titles and bounds the generated card text', () => {
  const svg = socialCardSvg(`<script> ${'a'.repeat(100)}`);
  expect(svg).toContain('&lt;script&gt;');
  expect(svg).not.toContain('<script>');
  expect(svg).not.toContain('a'.repeat(100));
  expect(svg).toContain('width="1200" height="630"');
});
