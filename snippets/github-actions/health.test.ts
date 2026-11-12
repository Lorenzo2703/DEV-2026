import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isHealthy } from './health.ts';

test('accepts successful HTTP status codes', () => {
  assert.equal(isHealthy(200), true);
  assert.equal(isHealthy(299), true);
});

test('rejects failures and invalid codes', () => {
  for (const status of [199, 300, 500, 200.5, Number.NaN]) {
    assert.equal(isHealthy(status), false);
  }
});
