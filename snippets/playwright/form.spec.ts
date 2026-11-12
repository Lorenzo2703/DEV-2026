import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('a visitor can enter a name and the form has no automated violations', async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head><title>Contact</title></head>
      <body>
        <main>
          <h1>Contact</h1>
          <label for="name">Name</label>
          <input id="name" name="name">
          <button type="button">Continue</button>
        </main>
      </body>
    </html>
  `);
  await page.getByLabel('Name').fill('Ada');
  await expect(page.getByLabel('Name')).toHaveValue('Ada');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
