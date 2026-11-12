import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home page provides the main handbook navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /build and operate software/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured blueprints' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Technology radar' })).toBeVisible();
});

test('analytics is disabled by default and exposes privacy settings when configured', async ({
  page,
}) => {
  await page.goto('/');
  const tracker = page.locator('script[data-website-id]');
  if (!process.env.UMAMI_SCRIPT_PATH) {
    await expect(tracker).toHaveCount(0);
    return;
  }
  await expect(tracker).toHaveAttribute('src', process.env.UMAMI_SCRIPT_PATH);
  await expect(tracker).toHaveAttribute('data-exclude-search', 'true');
  await expect(tracker).toHaveAttribute('data-exclude-hash', 'true');
  await expect(tracker).toHaveAttribute('data-do-not-track', 'true');
});

for (const collection of ['guides', 'blueprints', 'posts']) {
  test(`${collection} index displays published entries or an empty state`, async ({ page }) => {
    await page.goto(`/${collection}/`);
    const entries = page.locator('main article');
    if ((await entries.count()) > 0) {
      await expect(entries.first().getByRole('link')).toBeVisible();
    } else {
      await expect(page.getByText(`No ${collection} have been published yet.`)).toBeVisible();
    }
  });
}

test('home page has no WCAG 2.2 AA accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('theme override persists and can return to system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByLabel('Theme').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/tools/');
  await expect(page.getByLabel('Theme')).toHaveValue('light');
  const card = page.locator('#tool-list article').first();
  const lightBackground = await card.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(lightBackground);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByLabel('Theme').selectOption('system');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await expect
    .poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(lightBackground);
});

for (const tool of [
  {
    url: '/tools/languages-runtimes/typescript/',
    title: 'TypeScript',
    sample: 'export function parseServiceConfig',
  },
  { url: '/tools/package-management/bun/', title: 'Bun', sample: 'export function welcome' },
  { url: '/tools/frontend/astro/', title: 'Astro', sample: 'Ship a static site' },
  { url: '/tools/testing/vitest/', title: 'Vitest', sample: 'export function slugify' },
  { url: '/tools/styling-ui/tailwind-css/', title: 'Tailwind CSS', sample: 'import tailwindcss' },
  { url: '/tools/testing/playwright/', title: 'Playwright', sample: 'new AxeBuilder' },
  {
    url: '/tools/deployment/cloudflare/',
    title: 'Cloudflare Workers static assets',
    sample: 'compatibility_date',
  },
  {
    url: '/tools/observability/opentelemetry/',
    title: 'OpenTelemetry',
    sample: 'InMemorySpanExporter',
  },
  { url: '/tools/data/postgresql/', title: 'PostgreSQL', sample: 'CREATE TABLE tasks' },
  { url: '/tools/ci-cd/github-actions/', title: 'GitHub Actions', sample: 'cancel-in-progress' },
]) {
  test(`${tool.title} renders its imported snippet and has no accessibility violations`, async ({
    page,
  }) => {
    await page.goto(tool.url);
    await expect(page.getByRole('heading', { name: tool.title, exact: true })).toBeVisible();
    await expect(
      page.locator('pre:visible code').filter({ hasText: tool.sample }).first(),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test('code tabs expose their selected snippet', async ({ page }) => {
  await page.goto('/tools/styling-ui/tailwind-css/');
  await page.getByRole('tab', { name: 'astro.config.mjs' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'styles.css' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'styles.css' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('--color-ocean', { exact: false })).toBeVisible();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const expected = await page.locator('#tailwind-config-panel-1 code').textContent();
  await page.locator('#tailwind-config').getByRole('button', { name: 'Copy code' }).click();
  await expect(page.locator('#tailwind-config output')).toHaveText('Code copied.');
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(
    expected,
  );
});

test('code blocks highlight configured lines and remain keyboard accessible', async ({ page }) => {
  await page.goto('/tools/languages-runtimes/typescript/');
  const block = page.locator('#typescript-config-panel-0');
  await expect(block.locator('.line.highlighted')).toHaveCount(3);
  await expect(block.locator('pre')).toHaveAttribute('tabindex', '0');
  await expect(block.locator('code span[style]').first()).toBeVisible();
});

test('package manager tabs show equivalent runnable commands', async ({ page }) => {
  await page.goto('/tools/frontend/astro/');
  const example = page.locator('#astro-package-manager');
  for (const [label, command] of [
    ['Bun', 'bun run verify'],
    ['npm', 'npm run verify'],
    ['pnpm', 'pnpm run verify'],
    ['Yarn', 'yarn run verify'],
  ] as const) {
    await example.getByRole('tab', { name: label, exact: true }).click();
    await expect(example.locator('pre:visible code')).toHaveText(command);
  }
});

test('tool pages link their sections and related category neighbors', async ({ page }) => {
  await page.goto('/tools/testing/playwright/');
  await expect(page.getByText(/\d+ min read/)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'On this page' })
    .getByRole('link', { name: 'Test it' })
    .click();
  await expect(page).toHaveURL(/#test-it$/);
  await page
    .getByRole('navigation', { name: 'More in this category' })
    .getByRole('link', { name: 'Next: Vitest' })
    .click();
  await expect(page).toHaveURL(/\/tools\/testing\/vitest\/$/);
});

test('tool topics link to published guides with the same tag', async ({ page }) => {
  await page.goto('/tools/testing/playwright/');
  await page.getByRole('link', { name: 'browser', exact: true }).click();
  await expect(page).toHaveURL(/\/tags\/browser\/$/);
  await expect(page.getByRole('heading', { name: 'Playwright' })).toBeVisible();
});

test('verification badges become stale without rebuilding the site', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-03-01T00:00:00Z') });
  await page.goto('/tools/testing/playwright/');
  await expect(page.getByText('Needs review')).toBeVisible();
});

test('tool filters combine selections and reset', async ({ page }) => {
  await page.goto('/tools/');
  const initialCount = await page.getByRole('status').textContent();
  await page.getByLabel('Category').selectOption('testing');
  await expect(page.getByRole('status')).toHaveText('2 guides found.');
  await page.getByLabel('Difficulty').selectOption('intermediate');
  await expect(page.getByRole('status')).toHaveText('1 guide found.');
  await expect(page.getByRole('heading', { name: 'Playwright' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vitest' })).toBeHidden();
  await page.getByLabel('Pricing').selectOption('mixed');
  await expect(page.getByRole('status')).toHaveText('0 guides found.');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('status')).toHaveText(initialCount ?? '');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('tool guides remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/tools/');
  await expect(page.getByRole('heading', { name: 'Playwright' })).toBeVisible();
  await expect(page.getByLabel('Category')).toBeHidden();
  await page.goto('/tools/styling-ui/tailwind-css/');
  await expect(page.getByRole('heading', { name: 'astro.config.mjs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'styles.css' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'index.astro' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Tailwind configuration' })).toBeHidden();
  await expect(page.locator('#tailwind-config pre')).toHaveCount(3);
  for (const sample of await page.locator('#tailwind-config pre').all()) {
    await expect(sample).toBeVisible();
  }
  await context.close();
});

test('search finds pages and filters by category', async ({ page }) => {
  await page.goto('/search/');
  await page.getByLabel('Search terms').fill('Playwright');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.locator('#search-results').getByRole('link', { name: 'Playwright' }),
  ).toBeVisible();
  await page.getByLabel('Category').selectOption('data');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('0 results found.');
  await page.getByLabel('Category').selectOption('testing');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.locator('#search-results').getByRole('link', { name: 'Playwright' }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('search reports an unavailable index', async ({ page }) => {
  await page.route('**/pagefind/pagefind.js', (route) => route.abort());
  await page.goto('/search/');
  await page.getByLabel('Search terms').fill('Playwright');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Search is unavailable');
});

test('configured feeds, canonical URLs, and sitemap contain published content', async ({
  page,
}) => {
  test.skip(!process.env.SITE_URL, 'SITE_URL is required for publishing metadata.');
  const origin = new URL(process.env.SITE_URL ?? '').origin;
  await page.goto('/tools/testing/playwright/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `${origin}/tools/testing/playwright/`,
  );
  await expect(page.locator('link[rel="alternate"][title="testing tool guides"]')).toHaveAttribute(
    'href',
    '/feeds/testing.xml',
  );
  const verifiedAt = await page.locator('article time').getAttribute('datetime');
  expect(verifiedAt).toBeTruthy();
  const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(imageUrl).toBe(`${origin}/og/tools/testing/playwright.png`);
  const image = await page.request.get('/og/tools/testing/playwright.png');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
  const dimensions = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/og/tools/testing/playwright.png';
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  expect(dimensions).toEqual([1200, 630]);
  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '',
  );
  expect(jsonLd['@type']).toBe('TechArticle');
  expect(jsonLd.url).toBe(`${origin}/tools/testing/playwright/`);

  const parseXml = async (path: string) => {
    const response = await page.request.get(path);
    expect(response.ok()).toBe(true);
    const source = await response.text();
    return page.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      return {
        error: Boolean(document.querySelector('parsererror')),
        locations: [...document.getElementsByTagName('loc')].map((node) => node.textContent),
        links: [...document.getElementsByTagName('item')].map(
          (item) => item.querySelector('link')?.textContent,
        ),
        lastmods: [...document.getElementsByTagName('lastmod')].map((node) => node.textContent),
      };
    }, source);
  };
  const sitemap = await parseXml('/sitemap.xml');
  expect(sitemap.error).toBe(false);
  expect(sitemap.locations).toContain(`${origin}/tools/testing/playwright/`);
  expect(sitemap.lastmods).toContain(verifiedAt);
  const allFeed = await parseXml('/rss.xml');
  expect(allFeed.error).toBe(false);
  expect(allFeed.links).toContain(`${origin}/tools/testing/playwright/`);
  const categoryFeed = await parseXml('/feeds/testing.xml');
  expect(categoryFeed.error).toBe(false);
  expect(categoryFeed.links).toContain(`${origin}/tools/testing/playwright/`);
  expect(categoryFeed.links).not.toContain(`${origin}/tools/data/postgresql/`);
});
