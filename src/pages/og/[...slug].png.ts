import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { socialCardSvg } from '../../lib/social-card';

export async function getStaticPaths() {
  const [tools, guides, blueprints, posts] = await Promise.all([
    getCollection('tools', ({ data }) => !data.draft),
    getCollection('guides', ({ data }) => !data.draft),
    getCollection('blueprints', ({ data }) => !data.draft),
    getCollection('posts', ({ data }) => !data.draft),
  ]);
  return [
    { params: { slug: 'site' }, props: { title: 'Build and operate software with confidence' } },
    ...[...tools, ...guides, ...blueprints, ...posts].map((entry) => ({
      params: { slug: `${entry.collection}/${entry.id}` },
      props: { title: entry.data.title },
    })),
  ];
}

export const GET: APIRoute<{ title: string }> = async ({ props }) => {
  const image = await sharp(Buffer.from(socialCardSvg(props.title)))
    .png()
    .toBuffer();
  return new Response(new Uint8Array(image), {
    headers: { 'Content-Type': 'image/png' },
  });
};
