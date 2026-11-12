import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

export async function getStaticPaths() {
  if (!import.meta.env.SITE) return [];
  const entries = await getCollection('tools', ({ data }) => !data.draft);
  return [...new Set(entries.map((entry) => entry.data.category))].map((category) => ({
    params: { category },
    props: { entries: entries.filter((entry) => entry.data.category === category) },
  }));
}

export const GET: APIRoute<{ entries: CollectionEntry<'tools'>[] }> = async ({
  params,
  props,
  site,
}) => {
  if (!site) throw new Error('SITE_URL is required to generate category feeds.');
  const { entries } = props;
  return rss({
    title: `Dev in 2026: ${params.category}`,
    description: `Tool guides in ${params.category}.`,
    site,
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.summary,
      link: `/tools/${entry.id}/`,
      categories: entry.data.tags,
    })),
    customData: '<language>en</language>',
  });
};
