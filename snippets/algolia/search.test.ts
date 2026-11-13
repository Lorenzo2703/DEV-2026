import assert from 'node:assert/strict';
import { test } from 'node:test';
import { algoliasearch } from 'algoliasearch';
import { searchGuides } from './search.ts';

test('searches the selected index with a bounded page size', async () => {
  let requestBody = '';
  let requestUrl = '';
  const client = algoliasearch('example-app', 'example-search-key', {
    requester: {
      async send(request) {
        requestUrl = request.url;
        requestBody = String(request.data);
        return {
          status: 200,
          isTimedOut: false,
          content: JSON.stringify({ hits: [{ objectID: '1', title: 'Rust', url: '/rust/' }] }),
        };
      },
    },
  });
  const hits = await searchGuides(client, 'guides', 'rust');
  assert.match(requestUrl, /indexes\/guides\/query/);
  assert.deepEqual(JSON.parse(requestBody), { query: 'rust', hitsPerPage: 10 });
  assert.deepEqual(hits, [{ objectID: '1', title: 'Rust', url: '/rust/' }]);
});

test('surfaces API errors', async () => {
  const client = algoliasearch('example-app', 'example-search-key', {
    requester: {
      async send() {
        return { status: 403, isTimedOut: false, content: '{"message":"Forbidden"}' };
      },
    },
  });
  await assert.rejects(searchGuides(client, 'guides', 'rust'), /Forbidden/);
});
