import { expect, test } from './support/fixtures';
import { e2eEnv } from './support/env';
import { expectNoCriticalConsoleErrors } from './support/assertions';
import {
  addCurrentProductToCart,
  clearClientStore,
  openProduct,
  toggleCurrentProductWishlist,
} from './support/storefront';

test.describe('cart and wishlist', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eEnv.standardProductSlug, 'Set E2E_STANDARD_PRODUCT_SLUG to run cart and wishlist E2E coverage.');
    await clearClientStore(page);
  });

  test('standard product cart quantity, persistence, summary, remove, and empty state work', async ({ page, consoleErrors }) => {
    const slug = e2eEnv.standardProductSlug as string;

    await openProduct(page, slug);
    await addCurrentProductToCart(page);

    await page.goto('/cart');
    const cartItem = page.locator(`[data-testid="cart-item"][data-product-slug="${slug}"]`);
    await expect(cartItem).toBeVisible();
    await expect(page.getByTestId('cart-summary')).toBeVisible();
    await expect(page.getByText(/Shipping/i)).toBeVisible();
    await expect(page.getByText(/free shipping/i)).toBeVisible();

    await cartItem.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(cartItem.locator('[data-slot="quantity-value"]')).toHaveText('2');

    await page.reload();
    await expect(page.locator(`[data-testid="cart-item"][data-product-slug="${slug}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="cart-item"][data-product-slug="${slug}"] [data-slot="quantity-value"]`)).toHaveText('2');

    await page.locator(`[data-testid="cart-item"][data-product-slug="${slug}"]`).getByRole('button', { name: 'Decrease quantity' }).click();
    await expect(page.locator(`[data-testid="cart-item"][data-product-slug="${slug}"] [data-slot="quantity-value"]`)).toHaveText('1');

    await page.locator(`[data-testid="cart-item"][data-product-slug="${slug}"]`).getByTestId('cart-item-remove').click();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('wishlist add, persistence, and remove work', async ({ page, consoleErrors }) => {
    const slug = e2eEnv.standardProductSlug as string;

    await openProduct(page, slug);
    await toggleCurrentProductWishlist(page);
    await expect(page.getByText('Added to wishlist')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('wishlist-toggle')).toContainText('Remove from Wishlist');

    await toggleCurrentProductWishlist(page);
    await expect(page.getByText('Removed from wishlist')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('wishlist-toggle')).toContainText('Add to Wishlist');
    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});
