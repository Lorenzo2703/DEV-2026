import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReviewAction } from './action.mjs';

test('renders a labelled non-submitting button and preserves disabled state', () => {
  const html = renderToStaticMarkup(createElement(ReviewAction, { disabled: true }));
  assert.match(html, /<button\b/);
  assert.match(html, /type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(html, />Review deployment<\/button>/);
});
