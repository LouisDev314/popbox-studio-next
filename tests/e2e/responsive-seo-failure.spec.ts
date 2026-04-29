import { expect, test } from './support/fixtures';
import { expectNoCriticalConsoleErrors, expectNoStackTrace, expectPageMetadata, expectUsablePage } from './support/assertions';

test.describe('responsive, failure, and SEO checks', () => {
  test('mobile header menu, search, cart, and product filters remain usable', async ({ page, consoleErrors, isMobile }) => {
    test.skip(!isMobile, 'This check runs only in the mobile project.');

    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Store navigation menu' })).toBeVisible();
    await page.getByRole('link', { name: 'Show All' }).click();
    await expect(page).toHaveURL(/\/products/);

    await page.getByRole('button', { name: 'Open search' }).click();
    await expect(page.getByRole('dialog', { name: 'Search PopBox Studio products' })).toBeVisible();
    await page.getByPlaceholder('Search figures, kuji, or series...').fill('anime');
    await page.getByPlaceholder('Search figures, kuji, or series...').press('Enter');
    await expect(page).toHaveURL(/\/search\/results\?q=anime/);

    await page.goto('/cart');
    await expectUsablePage(page);
    await expect(
      page.getByRole('button', { name: 'Check Out' }).or(page.getByRole('link', { name: 'Browse products' })),
    ).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('autocomplete API failure shows a friendly message without stack traces', async ({ page, consoleErrors }) => {
    await page.route('**/api/v1/search/autocomplete**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          code: 500,
          success: false,
          message: 'E2E simulated failure.',
          data: null,
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Open search' }).click();
    await page.getByPlaceholder('Search figures, kuji, or series...').fill('dragon');

    await expect(page.getByText('Autocomplete is unavailable right now.')).toBeVisible();
    await expectNoStackTrace(page.locator('body'));
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('homepage and legal pages expose basic metadata', async ({ page, consoleErrors }) => {
    for (const route of ['/', '/legal/shipping-returns', '/legal/terms', '/legal/privacy']) {
      await page.goto(route);
      await expectPageMetadata(page);
    }

    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});
