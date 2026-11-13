import assert from 'node:assert/strict';
import { test } from 'node:test';

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be an integer from 1 to 65535');
  }
  return port;
}

test('validates the service port', () => {
  assert.equal(parsePort('8080'), 8080);
  assert.throws(() => parsePort('0'));
});
