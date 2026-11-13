import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseDocument } from 'yaml';

function readConfig(name) {
  const document = parseDocument(readFileSync(new URL(name, import.meta.url), 'utf8'), {
    uniqueKeys: true,
  });
  assert.deepEqual(document.errors, [], `${name} must be valid, unambiguous YAML`);
  return document.toJS();
}

test('API routing is host-scoped, segment-bounded, and outranks the SPA fallback', () => {
  const { http } = readConfig('routes.yml');
  assert.equal(
    http.routers.api.rule,
    'Host(`app.example.test`) && (Path(`/api`) || PathPrefix(`/api/`))',
  );
  assert.ok(http.routers.api.priority > http.routers.frontend.priority);
  assert.equal(http.routers.frontend.rule, 'Host(`app.example.test`)');
  assert.equal(http.routers.api.service, 'api');
  assert.equal(http.routers.frontend.service, 'frontend');
});

test('only HTTPS application routes resolve to defined private upstreams', () => {
  const config = readConfig('routes.yml');
  const install = readConfig('traefik.yml');
  assert.equal(install.entryPoints.websecure.address, ':443');
  assert.equal(install.providers.file.directory, '/etc/traefik/dynamic');
  assert.equal(install.providers.docker, undefined);
  assert.equal(install.api, undefined);
  assert.deepEqual(Object.keys(config.http.routers).sort(), ['api', 'frontend']);
  for (const router of Object.values(config.http.routers)) {
    assert.deepEqual(router.entryPoints, ['websecure']);
    assert.deepEqual(router.tls, {});
    const service = config.http.services[router.service];
    assert.ok(service, 'every router must resolve to an existing service');
    for (const server of service.loadBalancer.servers) {
      const upstream = new URL(server.url);
      assert.ok(['frontend', 'api'].includes(upstream.hostname));
      assert.equal(upstream.port, '8080');
    }
  }
  assert.deepEqual(config.tls.certificates, [
    { certFile: '/run/secrets/app-cert.pem', keyFile: '/run/secrets/app-key.pem' },
  ]);
});
