import { expect, test } from './support/fixtures';
import { e2eEnv } from './support/env';
import {
  expectNoCriticalConsoleErrors,
  expectPageMetadata,
  expectProductImagesHaveAltText,
  expectSearchNoIndex,
  expectUsablePage,
} from './support/assertions';

const CORE_ROUTES = [
  '/',
  '/products',
  '/cart',
  '/contact',
  '/faq',
  '/legal/shipping-returns',
  '/legal/terms',
  '/legal/privacy',
] as const;

test.describe('smoke and availability', () => {
  for (const route of CORE_ROUTES) {
    test(`${route} loads usable storefront chrome`, async ({ page, consoleErrors }) => {
      await page.goto(route);

      await expectUsablePage(page);
      await expectPageMetadata(page);
      await expectNoCriticalConsoleErrors(consoleErrors);
    });
  }

  test('configured standard PDP loads with SEO and image accessibility', async ({ page, consoleErrors }) => {
    test.skip(!e2eEnv.standardProductSlug, 'Set E2E_STANDARD_PRODUCT_SLUG to run PDP smoke coverage.');

    await page.goto(`/products/${e2eEnv.standardProductSlug}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('product-actions')).toBeVisible();
    await expectPageMetadata(page);
    await expectProductImagesHaveAltText(page);
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('configured kuji PDP loads when provided', async ({ page, consoleErrors }) => {
    test.skip(!e2eEnv.kujiProductSlug, 'Set E2E_KUJI_PRODUCT_SLUG to run kuji PDP smoke coverage.');

    await page.goto(`/products/${e2eEnv.kujiProductSlug}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/per ticket/i)).toBeVisible();
    await expect(page.getByText(/How Ichiban Kuji Works/i)).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('search results are noindex', async ({ page, consoleErrors }) => {
    await page.goto('/search/results?q=e2e');

    await expect(page.getByRole('heading', { name: 'Search Results' })).toBeVisible();
    await expectSearchNoIndex(page);
    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});
