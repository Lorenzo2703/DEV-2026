import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { escapeXml } from '../lib/xml';

export function getStaticPaths() {
  return import.meta.env.SITE ? [{ params: { feed: 'rss' } }, { params: { feed: 'sitemap' } }] : [];
}

export const GET: APIRoute = async ({ params, site }) => {
  if (!site) throw new Error('SITE_URL is required to generate feeds and the sitemap.');
  const [tools, guides, blueprints, posts] = await Promise.all([
    getCollection('tools', ({ data }) => !data.draft),
    getCollection('guides', ({ data }) => !data.draft),
    getCollection('blueprints', ({ data }) => !data.draft),
    getCollection('posts', ({ data }) => !data.draft),
  ]);
  if (params.feed === 'rss') {
    return rss({
      title: 'Dev in 2026',
      description: 'Practical guides for building and operating software.',
      site,
      items: [
        ...tools.map((entry) => ({
          title: entry.data.title,
          description: entry.data.summary,
          link: `/tools/${entry.id}/`,
          categories: entry.data.tags,
        })),
        ...[...guides, ...blueprints, ...posts].map((entry) => ({
          title: entry.data.title,
          description: entry.data.summary,
          link: `/${entry.collection}/${entry.id}/`,
          ...(entry.collection === 'posts' ? { pubDate: entry.data.publishedAt } : {}),
        })),
      ],
      customData: '<language>en</language>',
    });
  }

  if (params.feed !== 'sitemap') throw new Error(`Unknown XML endpoint: ${params.feed}`);
  const paths = [
    ...['/', '/tools/', '/guides/', '/blueprints/', '/posts/', '/radar/', '/search/'].map(
      (path) => ({ path }),
    ),
    ...tools.map((entry) => ({ path: `/tools/${entry.id}/`, lastmod: entry.data.verifiedAt })),
    ...[...guides, ...blueprints, ...posts].map((entry) => ({
      path: `/${entry.collection}/${entry.id}/`,
    })),
    ...[...new Set([...tools, ...guides, ...posts].flatMap((entry) => entry.data.tags))].map(
      (tag) => ({
        path: `/tags/${encodeURIComponent(tag)}/`,
      }),
    ),
  ];
  if (paths.length > 50_000) throw new Error('Sitemap exceeds the 50,000 URL limit.');
  const urls = paths.map(({ path, ...metadata }) => {
    const lastmod =
      'lastmod' in metadata && metadata.lastmod instanceof Date
        ? `<lastmod>${metadata.lastmod.toISOString()}</lastmod>`
        : '';
    return `<url><loc>${escapeXml(new URL(path, site).href)}</loc>${lastmod}</url>`;
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
    {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    },
  );
};
