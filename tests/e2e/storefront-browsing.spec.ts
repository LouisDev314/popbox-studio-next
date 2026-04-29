import { expect, test } from './support/fixtures';
import { e2eEnv } from './support/env';
import {
  expectNoCriticalConsoleErrors,
  expectNoStackTrace,
  expectUsablePage,
} from './support/assertions';
import { gotoProductsPage, openProduct } from './support/storefront';

test.describe('storefront browsing', () => {
  test('product listing renders cards that navigate to PDPs', async ({ page, consoleErrors }) => {
    await gotoProductsPage(page);

    const cards = page.getByTestId('product-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    const firstHref = await cards.first().getAttribute('href');
    expect(firstHref).toMatch(/^\/products\/.+/);

    await cards.first().click();
    await expect(page).toHaveURL(/\/products\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('search results page remains usable', async ({ page, consoleErrors }) => {
    const query = e2eEnv.standardProductSlug ?? 'anime';

    await page.goto(`/search/results?q=${encodeURIComponent(query)}`);

    await expect(page.getByRole('heading', { name: 'Search Results' })).toBeVisible();
    await expect(page.getByText(`Showing results for "${query}"`)).toBeVisible();
    await expectNoStackTrace(page.locator('body'));
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('sort and type URLs render usable product views', async ({ page, consoleErrors }) => {
    await page.goto('/products?sort=trending');
    await expectUsablePage(page);
    await expect(page).toHaveURL(/\/products\?sort=trending/);

    await page.goto('/products?type=standard');
    await expectUsablePage(page);
    await expect(page).toHaveURL(/\/products\?type=standard/);

    await page.goto('/products?type=kuji');
    await expectUsablePage(page);
    await expect(page).toHaveURL(/\/products\?type=kuji/);
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('configured standard product shows inventory and can be purchased when in stock', async ({ page, consoleErrors }) => {
    test.skip(!e2eEnv.standardProductSlug, 'Set E2E_STANDARD_PRODUCT_SLUG to run standard PDP assertions.');

    await openProduct(page, e2eEnv.standardProductSlug as string);

    await expect(page.getByTestId('product-inventory-status')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).toBeVisible();
    await expect(page.getByTestId('wishlist-toggle')).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('configured sold-out product cannot be added to cart', async ({ page, consoleErrors }) => {
    test.skip(!e2eEnv.soldOutProductSlug, 'Set E2E_SOLD_OUT_PRODUCT_SLUG to run sold-out coverage.');

    await openProduct(page, e2eEnv.soldOutProductSlug as string);

    await expect(page.getByTestId('product-inventory-status')).toHaveAttribute('data-inventory-status', 'sold_out');
    await expect(page.getByTestId('add-to-cart')).toBeDisabled();
    await expect(page.getByTestId('add-to-cart')).toContainText(/sold out/i);
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('configured kuji product shows ticket and prize context', async ({ page, consoleErrors }) => {
    test.skip(!e2eEnv.kujiProductSlug, 'Set E2E_KUJI_PRODUCT_SLUG to run kuji browsing coverage.');

    await openProduct(page, e2eEnv.kujiProductSlug as string);

    await expect(page.getByText(/per ticket/i)).toBeVisible();
    await expect(page.getByText(/Each ticket guarantees a prize/i)).toBeVisible();
    await expect(page.getByText(/prize/i).first()).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});
