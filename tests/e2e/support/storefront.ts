import type { Page } from '@playwright/test';
import { expect } from './fixtures';

export async function clearClientStore(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.removeItem('popbox-cart-storage');
    window.localStorage.removeItem('popbox-wishlist-storage');
    window.sessionStorage.clear();
  });
}

export async function openProduct(page: Page, slug: string): Promise<void> {
  await page.goto(`/products/${encodeURIComponent(slug)}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export async function addCurrentProductToCart(page: Page): Promise<void> {
  const addToCart = page.getByTestId('add-to-cart');
  await expect(addToCart).toBeVisible();
  await expect(addToCart).toBeEnabled();
  await addToCart.click();
  await expect(page.getByRole('status').or(page.getByText('Added to cart')).first()).toBeVisible();
}

export async function toggleCurrentProductWishlist(page: Page): Promise<void> {
  const toggle = page.getByTestId('wishlist-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toBeEnabled();
  await toggle.click();
}

export async function expectCartContainsProduct(page: Page, slug: string): Promise<void> {
  await page.goto('/cart');
  await expect(page.locator(`[data-testid="cart-item"][data-product-slug="${slug}"]`)).toHaveCount(1);
}

export async function gotoProductsPage(page: Page): Promise<void> {
  await page.goto('/products');
  await expect(page.getByRole('heading', { level: 1, name: 'All Products' })).toBeVisible();
}
