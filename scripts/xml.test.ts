import { expect, it } from 'vitest';
import { escapeXml } from '../src/lib/xml';

it('escapes XML special characters in text and URLs', () => {
  expect(escapeXml(`a&b <"x">'`)).toBe('a&amp;b &lt;&quot;x&quot;&gt;&apos;');
});
