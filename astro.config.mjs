// @ts-check

import { statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL;
if (site) {
  const url = new URL(site);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'SITE_URL must be an HTTPS origin without credentials, path, query, or fragment.',
    );
  }
} else {
  console.warn(
    'SITE_URL is not set: canonical URLs, RSS feeds, and the sitemap will not be generated.',
  );
}

const analytics = [
  process.env.UMAMI_SCRIPT_PATH,
  process.env.UMAMI_HOST_URL,
  process.env.UMAMI_WEBSITE_ID,
];
if (analytics.some(Boolean)) {
  const [scriptPath, host, websiteId] = analytics;
  if (!site || !scriptPath || !host || !websiteId) {
    throw new Error(
      'Analytics requires SITE_URL, UMAMI_SCRIPT_PATH, UMAMI_HOST_URL, and UMAMI_WEBSITE_ID.',
    );
  }
  const collector = new URL(host);
  if (
    collector.protocol !== 'https:' ||
    collector.username ||
    collector.password ||
    collector.pathname !== '/' ||
    collector.search ||
    collector.hash
  ) {
    throw new Error(
      'UMAMI_HOST_URL must be an HTTPS origin without credentials, path, query, or fragment.',
    );
  }
  if (!/^\/[a-zA-Z0-9_./-]+\.js$/.test(scriptPath) || scriptPath.split('/').includes('..')) {
    throw new Error('UMAMI_SCRIPT_PATH must be a same-origin JavaScript path under public/.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(websiteId)) {
    throw new Error('UMAMI_WEBSITE_ID must be a UUID.');
  }
  const publicRoot = resolve('public');
  const tracker = resolve(publicRoot, `.${scriptPath}`);
  if (!tracker.startsWith(`${publicRoot}${sep}`) || !statSync(tracker).isFile()) {
    throw new Error('The configured Umami tracker must be an existing file under public/.');
  }
}

export default defineConfig({
  site,
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
