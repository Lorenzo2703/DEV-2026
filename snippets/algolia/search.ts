import { algoliasearch } from 'algoliasearch';

type SearchClient = ReturnType<typeof algoliasearch>;
type Guide = { title: string; url: string };

export async function searchGuides(client: SearchClient, indexName: string, query: string) {
  const result = await client.searchSingleIndex<Guide>({
    indexName,
    searchParams: { query, hitsPerPage: 10 },
  });
  return result.hits.map(({ objectID, title, url }) => ({ objectID, title, url }));
}

export function createSearchClient(applicationId: string, searchKey: string) {
  return algoliasearch(applicationId, searchKey);
}
