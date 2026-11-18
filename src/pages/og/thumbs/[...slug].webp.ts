import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { socialCardSvg } from '../../../lib/social-card';

export async function getStaticPaths() {
  const tools = await getCollection('tools', ({ data }) => !data.draft);
  return tools.map((tool) => ({
    params: { slug: `tools/${tool.id}` },
    props: { title: tool.data.title },
  }));
}

export const GET: APIRoute<{ title: string }> = async ({ props }) => {
  const image = await sharp(Buffer.from(socialCardSvg(props.title)))
    .resize(400, 210)
    .webp({ quality: 78 })
    .toBuffer();
  return new Response(new Uint8Array(image), {
    headers: { 'Content-Type': 'image/webp' },
  });
};
