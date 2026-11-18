import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Copilot guide exposes prompts and accessible interactive diagrams', async ({
  page,
}, testInfo) => {
  await page.goto('/tools/');
  await page.getByRole('link', { name: 'GitHub Copilot', exact: true }).click();
  await expect(page).toHaveURL('/tools/ai-dev/github-copilot/');
  await expect(page.getByRole('heading', { name: 'Core Capabilities & Modes' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Context Engineering (The 80/20 Rule)' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Anti-Patterns to Avoid' })).toBeVisible();
  await expect(page.locator('#copilot-scaffold')).toContainText('Wait for approval before edits');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#copilot-scaffold').getByRole('button', { name: 'Copy code' }).click();
  await expect(page.locator('#copilot-scaffold').getByRole('status')).toHaveText('Code copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'Goal: implement [FEATURE]',
  );
  await page
    .locator('#copilot-tests')
    .getByRole('tab', { name: 'Integration tests', exact: true })
    .click();
  await expect(page.locator('#copilot-tests').getByRole('tabpanel')).toContainText(
    'cross-tenant access',
  );
  await page
    .locator('#copilot-maintenance')
    .getByRole('tab', { name: 'Documentation / OpenAPI' })
    .click();
  await expect(page.locator('#copilot-maintenance').getByRole('tabpanel')).toContainText(
    'Do not invent endpoints',
  );
  await page
    .locator('#copilot-workflows')
    .getByRole('tab', { name: 'Legacy: feature.prompt.md' })
    .click();
  await expect(page.locator('#copilot-workflows').getByRole('tabpanel')).toContainText(
    'agent: agent',
  );

  const context = page.getByRole('figure', {
    name: 'Context engineering: assemble a focused request',
  });
  const workflow = page.getByRole('figure', { name: 'Agent workflow: plan, edit, test, review' });
  await context.getByRole('button', { name: 'Evidence', exact: true }).click();
  await expect(context.getByRole('button', { name: 'Evidence', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(context.getByText('Attach a small sanitized reproduction')).toBeVisible();
  await expect(context.getByText('State an observable outcome')).toBeHidden();
  const review = workflow.getByRole('button', { name: 'Review', exact: true });
  await review.focus();
  await page.keyboard.press('Space');
  await expect(review).toHaveAttribute('aria-pressed', 'true');
  await expect(workflow.getByText('Inspect the complete diff')).toBeVisible();
  await expect(context.getByText('Attach a small sanitized reproduction')).toBeVisible();

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const button of [review, page.getByRole('button', { name: 'Reset checklist' })]) {
    await button.hover();
    await expect(button).toHaveCSS('transform', 'none');
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await review.evaluate((button) => getComputedStyle(button).transitionDuration)).toBe('0s');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await context.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('copilot-context-desktop.png') });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await expect(context.getByRole('button', { name: 'Evidence', exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await context.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('copilot-context-mobile.png') });
});

test('Copilot onboarding saves known steps, restores progress, and resets only its own state', async ({
  page,
}, testInfo) => {
  const key = 'dev-in-2026:copilot-onboarding:v1';
  await page.goto('/tools/ai-dev/github-copilot/');
  const checklist = page.getByRole('region', { name: 'Copilot onboarding checklist' });
  const account = checklist.getByRole('checkbox', { name: /Confirm your approved account/ });
  const editor = checklist.getByRole('checkbox', { name: /Set up and sign in/ });
  await expect(checklist.locator('output')).toHaveText('0 of 9 steps completed');
  expect(
    await checklist.evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(600);
  await checklist.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('copilot-onboarding-desktop.png') });
  await account.focus();
  await page.keyboard.press('Space');
  await editor.check();
  await expect(checklist.locator('output')).toHaveText('2 of 9 steps completed');
  await expect(checklist.getByRole('progressbar')).toHaveAttribute('value', '2');
  expect(
    await page.evaluate(
      (storageKey) => JSON.parse(localStorage.getItem(storageKey) ?? 'null'),
      key,
    ),
  ).toEqual(['account', 'editor']);
  await page.evaluate(() => localStorage.setItem('copilot-unrelated-test', 'keep'));
  await page.reload();
  await expect(account).toBeChecked();
  await expect(editor).toBeChecked();
  await expect(checklist.locator('output')).toHaveText('2 of 9 steps completed');
  for (const checkbox of await checklist.getByRole('checkbox').all()) await checkbox.check();
  await expect(checklist.locator('output')).toHaveText('9 of 9 steps completed');
  await checklist.getByRole('button', { name: 'Reset checklist' }).click();
  await expect(checklist.locator('output')).toHaveText('0 of 9 steps completed');
  expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('copilot-unrelated-test'))).toBe('keep');
  await page.reload();
  await expect(account).not.toBeChecked();
});

for (const saved of ['{broken', '["account","unrecognized-step"]']) {
  test(`Copilot onboarding reports invalid saved data: ${saved}`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem('dev-in-2026:copilot-onboarding:v1', value);
    }, saved);
    await page.goto('/tools/ai-dev/github-copilot/');
    const checklist = page.getByRole('region', { name: 'Copilot onboarding checklist' });
    await expect(checklist.locator('[data-onboarding-storage]')).toContainText(
      'Saved progress could not be loaded',
    );
    await expect(checklist.locator('output')).toHaveText('0 of 9 steps completed');
    await expect(checklist.getByRole('checkbox').first()).not.toBeChecked();
    await checklist.getByRole('button', { name: 'Reset checklist' }).click();
    await expect(checklist.locator('[data-onboarding-storage]')).toContainText(
      'Saved progress cleared',
    );
    expect(
      await page.evaluate(() => localStorage.getItem('dev-in-2026:copilot-onboarding:v1')),
    ).toBeNull();
  });
}

test('Copilot onboarding remains usable when browser storage is denied', async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      const original: (this: Storage, key: string, value: string) => unknown =
        Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, {
        value(this: Storage, key: string, value = '') {
          if (key === 'dev-in-2026:copilot-onboarding:v1') {
            throw new DOMException('Storage denied', 'SecurityError');
          }
          return original.call(this, key, value);
        },
      });
    }
  });
  await page.goto('/tools/ai-dev/github-copilot/');
  const checklist = page.getByRole('region', { name: 'Copilot onboarding checklist' });
  await expect(checklist.locator('[data-onboarding-storage]')).toContainText(
    'Saved progress could not be loaded',
  );
  await checklist.getByRole('checkbox').first().check();
  await expect(checklist.locator('output')).toHaveText('1 of 9 steps completed');
  await expect(checklist.locator('[data-onboarding-storage]')).toContainText('could not be saved');
  await checklist.getByRole('button', { name: 'Reset checklist' }).click();
  await expect(checklist.locator('output')).toHaveText('0 of 9 steps completed');
  await expect(checklist.locator('[data-onboarding-storage]')).toContainText(
    'saved progress could not be cleared',
  );
});

test('Copilot guide keeps diagrams, samples, and onboarding readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4321/tools/ai-dev/github-copilot/');
    await expect(page.getByText('State an observable outcome')).toBeVisible();
    await expect(page.getByText('Define the verification boundary')).toBeVisible();
    await expect(page.getByText('Agree on scope before edits')).toBeVisible();
    await expect(page.getByText('Merge or return to the plan')).toBeVisible();
    await expect(page.locator('#copilot-tests')).toContainText('cross-tenant access');
    await expect(page.getByRole('button', { name: 'Reset checklist' })).toBeHidden();
    const checkbox = page.getByRole('checkbox', { name: /Confirm your approved account/ });
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    const notice = page.locator('[data-copilot-onboarding] noscript p');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('progress will not be saved between visits');
  } finally {
    await context.close();
  }
});

test('home page provides the main handbook navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /build and operate software/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Guides & posts' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Posts', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Search' }),
  ).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Latest announcement' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Introducing Dev in 2026' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured blueprints' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Technology radar' })).toBeVisible();
});

test('dated guide has accessible article metadata and a social card', async ({ page }) => {
  test.skip(!process.env.SITE_URL, 'SITE_URL is required for publishing metadata.');
  await page.goto('/guides/2026-11-13-introducing-dev-in-2026/');
  await expect(page.getByRole('heading', { name: 'Introducing Dev in 2026' })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(imageUrl).toBe(
    `${new URL(process.env.SITE_URL ?? 'https://example.test').origin}/og/guides/2026-11-13-introducing-dev-in-2026.png`,
  );
  const image = await page.request.get('/og/guides/2026-11-13-introducing-dev-in-2026.png');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
});

test('cross-cutting blueprints and stack guide are published', async ({ page }) => {
  await page.goto('/blueprints/');
  await expect(page.getByRole('link', { name: 'Static handbook site' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Node.js service foundation' })).toBeVisible();

  await page.goto('/guides/choosing-a-stack/');
  await expect(
    page.getByRole('heading', { name: 'Choose a stack by its boundaries' }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('identity platform blueprint has accessible visuals and reduced-motion diagrams', async ({
  page,
}) => {
  await page.goto('/blueprints/');
  await page.getByRole('link', { name: 'Angular + Keycloak application platform' }).click();
  await expect(page).toHaveURL(/\/blueprints\/angular-keycloak-platform\/$/);
  await expect(
    page.getByRole('heading', { name: 'Angular + Keycloak application platform', exact: true }),
  ).toBeVisible();
  const illustration = page.getByRole('img', { name: /browser application connects/i });
  await expect(illustration).toBeVisible();
  expect(
    await illustration.evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);
  await expect(page.locator('[data-stack-diagram]')).toHaveCount(3);
  await expect(page.getByText(/Needs verification:/)).toBeVisible();
  const node = page.locator('[data-stack-node]').first();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await node.evaluate((element) => getComputedStyle(element).animationName)).toBe(
    'stack-arrive',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await node.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');

  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.getByRole('figure', { name: /Identity flow:/ })).toBeVisible();
});

test('Spring Boot guide is discoverable and presents accessible runnable samples', async ({
  page,
}) => {
  await page.goto('/tools/');
  await page.getByRole('link', { name: 'Spring Boot', exact: true }).click();
  await expect(page).toHaveURL('/tools/backend-apis/spring-boot/');
  await expect(page.getByRole('heading', { name: 'Spring Boot', exact: true })).toBeVisible();
  const contract = page.locator('#spring-boot-application');
  await contract.getByRole('tab', { name: 'GreetingController.java' }).click();
  await expect(contract.getByRole('tabpanel')).toContainText('@Valid @RequestBody');
  await expect(contract.getByRole('tabpanel')).toContainText('principal.getSubject()');
  await expect(page.locator('#spring-boot-tests')).toContainText('RANDOM_PORT');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.goto('/blueprints/angular-keycloak-platform/');
  await expect(
    page.getByRole('link', { name: 'Spring Boot', exact: true }).first(),
  ).toHaveAttribute('href', '/tools/backend-apis/spring-boot/');
});

test('MongoDB guide exposes tested samples, recovery boundaries, and blueprint links', async ({
  page,
}) => {
  await page.goto('/tools/');
  await page.getByRole('link', { name: 'MongoDB', exact: true }).click();
  await expect(page).toHaveURL('/tools/data/mongodb/');
  await expect(page.getByRole('heading', { name: 'MongoDB', exact: true })).toBeVisible();
  await expect(page.locator('#mongodb-schema')).toContainText('validationAction');
  await expect(page.locator('#mongodb-tasks')).toContainText('expectedRevision');
  await expect(page.locator('#mongodb-tests')).toContainText("version: '9.0.8'");
  await expect(
    page.getByRole('heading', { name: 'Prove that a backup can restore service' }),
  ).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.goto('/blueprints/angular-keycloak-platform/');
  await expect(page.getByRole('link', { name: 'MongoDB', exact: true }).first()).toHaveAttribute(
    'href',
    '/tools/data/mongodb/',
  );
  await page.goto('/radar/');
  await expect(page.getByRole('link', { name: 'MongoDB', exact: true })).toBeVisible();
});

test('radar decision notes appear in their rings and open with tool links', async ({ page }) => {
  await page.goto('/radar/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Static content publishing' })).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: 'trial decision notes' })
      .getByRole('link', { name: 'Cloudflare Workers static assets' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'AI orchestration as a default dependency' }),
  ).toBeVisible();
  await page
    .getByRole('list', { name: 'adopt decision notes' })
    .getByRole('link', { name: 'Static content publishing' })
    .click();
  await expect(page).toHaveURL(/\/radar\/static-content\/$/);
  await expect(page.getByText('Ring: adopt')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Astro' })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('radar ring navigation is accessible and usable on narrow screens', async ({ page }) => {
  await page.goto('/radar/');
  const navigation = page.getByRole('navigation', { name: 'Recommendation rings' });
  await expect(navigation.getByRole('link')).toHaveCount(3);
  for (const ring of ['adopt', 'trial', 'assess']) {
    const link = navigation.locator(`a[href="#radar-${ring}"]`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#radar-${ring}$`));
    await expect(page.locator(`#radar-${ring}`)).toBeVisible();
  }
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute('data-theme', value),
      theme,
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await navigation.locator('a[href="#radar-trial"]').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#radar-trial$/);
  await expect(page.locator('#radar-trial')).toBeFocused();
  const tools = page.getByRole('list', { name: 'trial tools' }).getByRole('link');
  await expect(tools.first()).toBeVisible();
  await tools.first().click();
  await expect(page).toHaveURL(/\/tools\/.+\/$/);
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

for (const collection of ['guides', 'blueprints']) {
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

test('legacy post URLs redirect to the unified guide pages', async ({ page }) => {
  await page.goto('/posts/2026-11-13-introducing-dev-in-2026/');
  await expect(page).toHaveURL(/\/guides\/2026-11-13-introducing-dev-in-2026\/$/);
  await page.goto('/posts/');
  await expect(page).toHaveURL(/\/guides\/$/);
});

test('guides index includes both guides and dated posts', async ({ page }) => {
  await page.goto('/guides/');
  await expect(page.getByRole('heading', { name: 'Guides & Posts' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Choose a stack by its boundaries' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Introducing Dev in 2026' })).toBeVisible();
});

test('home stack builder supports multiple optional technologies per role', async ({ page }) => {
  await page.goto('/');
  const roadmap = page.locator('[data-technology-pathways]');
  await roadmap.locator('[data-scope-id="ai-app"]').click();
  await expect(roadmap.locator('svg')).toHaveCount(0);
  await expect(roadmap.locator('[data-summary-progress]')).toHaveText('0 roles selected');
  await expect(roadmap.locator('[data-summary-choices] li')).toHaveCount(0);

  const aiTooling = roadmap.locator('.roadmap-role[data-role-id="ai-tooling"]');
  await expect(aiTooling).toContainText('LangChain');
  await expect(aiTooling).toContainText('LangGraph');
  await expect(aiTooling).toContainText('LlamaIndex');
  await expect(
    roadmap.locator(
      '.roadmap-role[data-role-id="runtime"] [data-tool-id="languages-runtimes/typescript"]',
    ),
  ).toHaveCount(0);

  await aiTooling.locator('[data-tool-id="ai-dev/langchain"]').click();
  await aiTooling.locator('[data-tool-id="ai-dev/langgraph"]').click();
  await expect(aiTooling.locator('[data-tool-id="ai-dev/langgraph"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(aiTooling.locator('[data-tool-id="ai-dev/langchain"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await roadmap
    .locator('.roadmap-role[data-role-id="backend"] [data-tool-id="backend-apis/fastapi"]')
    .click();
  await roadmap
    .locator('.roadmap-role[data-role-id="database"] [data-tool-id="data/qdrant"]')
    .click();
  await roadmap
    .locator('.roadmap-role[data-role-id="frontend"] [data-tool-id="frontend/nextjs"]')
    .click();

  await expect(roadmap.locator('[data-summary-progress]')).toHaveText('4 roles selected');
  await expect(roadmap.locator('[data-summary-choices]')).toContainText('LangGraph');
  await expect(roadmap.locator('[data-summary-choices]')).toContainText('LangChain');
  await expect(roadmap.locator('[data-summary-choices]')).toContainText('FastAPI');
  await expect(roadmap.locator('[data-summary-choices]')).toContainText('Qdrant');
  await expect(roadmap.locator('[data-summary-choices]')).toContainText('Next.js');
  await expect(
    roadmap.locator('[data-summary-choices] a[href="/tools/ai-dev/langgraph/"]'),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await aiTooling.locator('[data-tool-id="ai-dev/langchain"]').click();
  await expect(aiTooling.locator('[data-tool-id="ai-dev/langchain"]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(roadmap.locator('[data-summary-choices]')).not.toContainText('LangChain');
  await expect(roadmap.locator('[data-summary-progress]')).toHaveText('4 roles selected');
  await aiTooling.locator('[data-tool-id="ai-dev/langgraph"]').click();
  await expect(roadmap.locator('[data-summary-progress]')).toHaveText('3 roles selected');
  await expect(roadmap.locator('[data-summary-choices]')).not.toContainText('AI tooling');

  await roadmap.locator('[data-scope-id="web-app"]').click();
  await expect(roadmap.locator('[data-summary-progress]')).toHaveText('0 roles selected');
  await expect(roadmap.locator('[data-summary-choices] li')).toHaveCount(0);
  await roadmap.locator('[data-roadmap-reset]').click();
  await expect(roadmap.locator('[data-stack-summary]')).toBeHidden();
  await expect(roadmap.locator('[data-role-stage]')).toBeHidden();
});

test('home stack builder hides irrelevant roles and offers web-specific alternatives', async ({
  page,
}) => {
  await page.goto('/');
  const roadmap = page.locator('[data-technology-pathways]');

  await roadmap.locator('[data-scope-id="static-site"]').click();
  await expect(roadmap.locator('.roadmap-role[data-role-id="backend"]')).toHaveCount(0);
  await expect(roadmap.locator('.roadmap-role[data-role-id="database"]')).toHaveCount(0);
  await expect(roadmap.locator('.roadmap-role[data-role-id="ai-tooling"]')).toHaveCount(0);

  await roadmap.locator('[data-scope-id="web-app"]').click();
  const runtime = roadmap.locator('.roadmap-role[data-role-id="runtime"]');
  await expect(runtime.locator('[data-tool-id="languages-runtimes/typescript"]')).toBeVisible();
  await expect(roadmap.locator('.roadmap-role[data-role-id="ai-tooling"]')).toHaveCount(0);
});

test('stack bootstrap downloads scripts with primary choices and manual setup', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const roadmap = page.locator('[data-technology-pathways]');
  await roadmap.locator('[data-scope-id="web-app"]').click();
  await roadmap.locator('[data-tool-id="frontend/astro"]').click();
  await roadmap.locator('[data-tool-id="frontend/nextjs"]').click();
  await roadmap.locator('[data-tool-id="languages-runtimes/nodejs"]').click();
  await roadmap.locator('[data-tool-id="languages-runtimes/python"]').click();
  await roadmap.locator('[data-tool-id="backend-apis/fastify"]').click();
  await roadmap.locator('[data-tool-id="data/postgresql"]').click();
  const downloadButton = roadmap.getByRole('button', { name: 'Download bootstrap script' });
  await expect(downloadButton).toBeDisabled();
  await roadmap.getByLabel('Primary Language / runtime').selectOption('languages-runtimes/nodejs');
  await expect(downloadButton).toBeDisabled();
  await roadmap.getByLabel('Primary Frontend').selectOption('frontend/astro');
  await expect(downloadButton).toBeEnabled();
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  const primaryDownload = page.waitForEvent('download');
  await downloadButton.click();
  const selectedScript = await primaryDownload;
  const selectedPath = testInfo.outputPath('primary.cjs');
  await selectedScript.saveAs(selectedPath);
  const source = await readFile(selectedPath, 'utf8');
  expect(source).toContain('"frontend":"frontend/astro"');
  expect(source).toContain('"id":"frontend/nextjs"');

  await roadmap.locator('[data-tool-id="frontend/astro"]').click();
  await roadmap.locator('[data-tool-id="frontend/nextjs"]').click();

  for (const [format, filename] of [
    ['node', 'bootstrap.cjs'],
    ['powershell', 'bootstrap.ps1'],
    ['shell', 'bootstrap.sh'],
  ] as const) {
    await roadmap.getByLabel('Script format').selectOption(format);
    const pending = page.waitForEvent('download');
    await downloadButton.click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(filename);
    const script = testInfo.outputPath(filename);
    await download.saveAs(script);
    const command =
      format === 'node' ? process.execPath : format === 'powershell' ? 'powershell.exe' : 'sh';
    const args =
      format === 'node'
        ? [script, `example-${format}`]
        : format === 'powershell'
          ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, `example-${format}`]
          : [script, `example-${format}`];
    if (format === 'node' || (format === 'powershell') === (process.platform === 'win32')) {
      const result = spawnSync(command, args, { cwd: dirname(script), encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
      const readme = await readFile(testInfo.outputPath(`example-${format}`, 'README.md'), 'utf8');
      expect(readme).toContain('Node.js (primary choice)');
      expect(readme).toContain('PostgreSQL');
      expect(readme).toContain('not automatically integrated');
    }
  }
});

test('home page has no WCAG 2.2 AA accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('system theme is the default and manual theme choice persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/tools/');
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  const card = page.locator('#tool-list article').first();
  const lightBackground = await card.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(() => card.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(lightBackground);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

test('light primary text contrasts with surfaces and is distinct from body text', async ({
  page,
}) => {
  for (const systemTheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: systemTheme });
    await page.goto('/');
    if (systemTheme === 'dark') {
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
    }
    const contrast = await page.evaluate(() => {
      function luminance(color: string): number {
        const channels = color.startsWith('#')
          ? color
              .slice(1)
              .match(/.{2}/g)
              ?.map((value) => Number.parseInt(value, 16))
          : color.match(/\d+/g)?.map(Number);
        if (channels?.length !== 3) throw new Error(`Unsupported color: ${color}`);
        const linear = channels.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        const [red, green, blue] = linear;
        if (red === undefined || green === undefined || blue === undefined) {
          throw new Error(`Incomplete color: ${color}`);
        }
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      }
      function ratio(first: string, second: string): number {
        const a = luminance(first);
        const b = luminance(second);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      }
      const link = document.querySelector('header nav a');
      if (!(link instanceof HTMLElement)) throw new Error('Primary navigation link is missing.');
      const root = getComputedStyle(document.documentElement);
      const primary = getComputedStyle(link).color;
      return {
        paper: ratio(primary, root.backgroundColor),
        soft: ratio(primary, root.getPropertyValue('--color-brand-soft').trim()),
        body: ratio(primary, getComputedStyle(document.body).color),
      };
    });
    expect(contrast.paper).toBeGreaterThanOrEqual(4.5);
    expect(contrast.soft).toBeGreaterThanOrEqual(4.5);
    expect(contrast.body).toBeGreaterThanOrEqual(3);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test('pointer glow follows the mouse without intercepting page interaction', async ({ page }) => {
  await page.goto('/');
  const glow = page.locator('.pointer-glow');
  await expect(glow).toHaveAttribute('aria-hidden', 'true');
  await page.mouse.move(160, 180);
  await expect
    .poll(() => glow.evaluate((element) => element.getAttribute('data-active')))
    .toBe('true');
  await expect(glow).toHaveCSS('pointer-events', 'none');
  await expect(glow).toHaveCSS('opacity', '1');
  expect(await glow.evaluate((element) => element.style.getPropertyValue('--pointer-x'))).toBe(
    '160px',
  );
});

for (const tool of [
  {
    url: '/tools/languages-runtimes/typescript/',
    title: 'TypeScript',
    sample: 'export function parseServiceConfig',
  },
  {
    url: '/tools/languages-runtimes/nodejs/',
    title: 'Node.js',
    sample: 'createHealthServer',
  },
  {
    url: '/tools/languages-runtimes/python/',
    title: 'Python',
    sample: 'def parse_service_config',
  },
  { url: '/tools/languages-runtimes/rust/', title: 'Rust', sample: 'pub fn parse_port' },
  { url: '/tools/package-management/pnpm/', title: 'pnpm', sample: 'packageManager' },
  { url: '/tools/package-management/bun/', title: 'Bun', sample: 'export function welcome' },
  { url: '/tools/package-management/uv/', title: 'uv', sample: 'requires-python' },
  { url: '/tools/package-management/mise/', title: 'mise', sample: '[tasks.verify]' },
  { url: '/tools/frontend/astro/', title: 'Astro', sample: 'Ship a static site' },
  { url: '/tools/frontend/nextjs/', title: 'Next.js', sample: 'Deployment checklist' },
  { url: '/tools/frontend/angular/', title: 'Angular', sample: 'selector: ' },
  { url: '/tools/testing/vitest/', title: 'Vitest', sample: 'export function slugify' },
  { url: '/tools/styling-ui/tailwind-css/', title: 'Tailwind CSS', sample: 'import tailwindcss' },
  { url: '/tools/styling-ui/shadcn-ui/', title: 'shadcn/ui', sample: 'Review deployment' },
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
  { url: '/tools/data/algolia/', title: 'Algolia', sample: 'export async function searchGuides' },
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
  await expect(page.getByRole('navigation', { name: 'On this page' })).toHaveClass(
    /table-of-contents/,
  );
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

test('tools catalog includes the registry and filters published guides', async ({ page }) => {
  await page.goto('/tools/');
  await expect(page.getByRole('heading', { name: 'All tools' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rust', exact: true })).toBeVisible();
  await expect(page.getByText('Guide planned').first()).toBeVisible();
  const registry = await readFile(new URL('../docs/tool-registry.md', import.meta.url), 'utf8');
  const tools = [
    ...registry.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/gm),
  ].map(([, category, title, slug]) => {
    if (!category || !title || !slug) throw new Error('Invalid registry row');
    return { category: category.trim(), title: title.trim(), slug };
  });
  expect(tools.length).toBeGreaterThan(0);
  const missing = await page
    .locator('#tool-list [data-tool]')
    .evaluateAll(
      (cards, expected) =>
        expected.filter(
          ({ category, title, slug }) =>
            !cards.some(
              (card) =>
                card.getAttribute('data-category') === category &&
                (card.querySelector('a')?.getAttribute('href') === `/tools/${category}/${slug}/` ||
                  card.querySelector('h2')?.textContent?.trim() === title),
            ),
        ),
      tools,
    );
  expect(missing).toEqual([]);
  await expect(page.locator('#tool-filters select')).toHaveCount(0);
  const initialCount = await page.getByRole('status').textContent();
  const all = page.getByRole('radio', { name: 'All', exact: true });
  const testing = page.getByRole('radio', { name: 'testing', exact: true });
  await expect(all).toBeChecked();
  await all.focus();
  await expect(all.locator(' + span')).toHaveCSS('outline-style', 'solid');
  await all.press('ArrowRight');
  await expect(all).not.toBeChecked();
  await testing.locator('..').click();
  await expect(testing).toBeChecked();
  const testingCount = await page.locator('#tool-list [data-category="testing"]').count();
  await expect(page.getByRole('status')).toHaveText(
    `${testingCount} ${testingCount === 1 ? 'tool' : 'tools'} found.`,
  );
  await expect(page.getByRole('heading', { name: 'Playwright' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vitest' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rust', exact: true })).toBeHidden();
  await all.locator('..').click();
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
  await expect(page.locator('#tool-filters')).toBeHidden();
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

test('selects remain usable in forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/search/');
  const category = page.getByLabel('Category');
  await expect(category).toHaveCSS('appearance', 'auto');
  await category.focus();
  await expect(category).toHaveCSS('outline-style', 'solid');
  await category.selectOption('testing');
  await expect(category).toHaveValue('testing');
});

test('search finds pages and filters by category', async ({ page }) => {
  await page.goto('/search/');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const searchButton = page.getByRole('button', { name: 'Search', exact: true });
  await searchButton.hover();
  await expect(searchButton).toHaveCSS('transform', 'none');
  await expect(page.getByLabel('Search terms')).toHaveCSS('min-height', '44px');
  await page.getByLabel('Category').focus();
  await expect(page.getByLabel('Category')).toHaveCSS('outline-style', 'solid');
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
  expect(sitemap.locations).toContain(`${origin}/radar/static-content/`);
  expect(sitemap.locations).toContain(`${origin}/guides/2026-11-13-introducing-dev-in-2026/`);
  await page.goto('/radar/static-content/');
  const radarVerifiedAt = await page.locator('article time').getAttribute('datetime');
  expect(radarVerifiedAt).toBeTruthy();
  expect(sitemap.lastmods).toContain(radarVerifiedAt);
  expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toBe(
    `${origin}/og/radar/static-content.png`,
  );
  const radarImage = await page.request.get('/og/radar/static-content.png');
  expect(radarImage.ok()).toBe(true);
  expect(radarImage.headers()['content-type']).toContain('image/png');
  const allFeed = await parseXml('/rss.xml');
  expect(allFeed.error).toBe(false);
  expect(allFeed.links).toContain(`${origin}/tools/testing/playwright/`);
  expect(allFeed.links).toContain(`${origin}/guides/2026-11-13-introducing-dev-in-2026/`);
  const categoryFeed = await parseXml('/feeds/testing.xml');
  expect(categoryFeed.error).toBe(false);
  expect(categoryFeed.links).toContain(`${origin}/tools/testing/playwright/`);
  expect(categoryFeed.links).not.toContain(`${origin}/tools/data/postgresql/`);
});
