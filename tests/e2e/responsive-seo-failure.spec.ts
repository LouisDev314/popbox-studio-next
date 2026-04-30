import { expect, test } from './support/fixtures';
import { expectNoCriticalConsoleErrors, expectNoStackTrace, expectPageMetadata, expectUsablePage } from './support/assertions';

test.describe('responsive, failure, and SEO checks', () => {
  test('storefront header does not overflow across responsive breakpoints', async ({ page, consoleErrors }) => {
    const viewportWidths = [390, 430, 768, 1024, 1280, 1440];

    for (const width of viewportWidths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      await expect(page.getByRole('link', { exact: true, name: 'PopBox Studio' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open search' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open wishlist' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open cart' })).toBeVisible();

      const primaryNav = page.getByRole('navigation', { name: 'Primary' });
      const menuButton = page.getByRole('button', { name: 'Open menu' });

      if (width >= 1280) {
        await expect(primaryNav).toBeVisible();
        await expect(menuButton).toBeHidden();
      } else {
        await expect(primaryNav).toBeHidden();
        await expect(menuButton).toBeVisible();
      }

      const hasHorizontalOverflow = await page.evaluate(() => (
        document.documentElement.scrollWidth > document.documentElement.clientWidth
        || document.body.scrollWidth > document.body.clientWidth
      ));
      expect(hasHorizontalOverflow, `Header introduced horizontal overflow at ${width}px`).toBe(false);
    }

    await expectNoCriticalConsoleErrors(consoleErrors);
  });

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

  test('autocomplete API failure shows a friendly message without stack traces', async ({ page, consoleErrors, serverErrors }) => {
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

    const unexpectedServerErrors = serverErrors.filter((entry) => !entry.includes('/api/v1/search/autocomplete'));
    expect(unexpectedServerErrors, unexpectedServerErrors.join('\n')).toEqual([]);
    expect(serverErrors.some((entry) => entry.includes('/api/v1/search/autocomplete'))).toBe(true);

    const unexpectedConsoleErrors = consoleErrors.filter((entry) => (
      !entry.includes('/api/v1/search/autocomplete')
      && !entry.includes('Failed to load resource: the server responded with a status of 500')
    ));
    expect(unexpectedConsoleErrors, unexpectedConsoleErrors.join('\n')).toEqual([]);
  });

  test('homepage and legal pages expose basic metadata', async ({ page, consoleErrors }) => {
    for (const route of ['/', '/legal/shipping-returns', '/legal/terms', '/legal/privacy']) {
      await page.goto(route);
      await expectPageMetadata(page);
    }

    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});
