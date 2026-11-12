import assert from 'node:assert/strict';
import { parseServiceConfig } from './config';

assert.deepEqual(parseServiceConfig({ serviceName: ' api ', port: 3000 }), {
  serviceName: 'api',
  port: 3000,
});
assert.equal(parseServiceConfig({ serviceName: 'api', port: 1 }).port, 1);
assert.equal(parseServiceConfig({ serviceName: 'api', port: 65535 }).port, 65535);
assert.throws(() => parseServiceConfig(null), /must be an object/);
assert.throws(() => parseServiceConfig({ serviceName: ' ', port: 3000 }), /serviceName/);
for (const port of [0, 65536, 1.5, '3000', undefined]) {
  assert.throws(() => parseServiceConfig({ serviceName: 'api', port }), /port/);
}
console.log('Configuration validation tests passed.');
