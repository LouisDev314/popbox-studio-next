import { expect, test } from './fixtures/mock-services';

test('standard variants select, price, and persist as distinct cart lines', async ({ page }) => {
  await page.goto('/products/first-featured-figure');

  await expect(page.getByRole('radio', { name: /small/i })).toBeChecked();
  await expect(page.getByRole('radio', { name: /collector/i })).toBeDisabled();

  await page.getByRole('radio', { name: /large/i }).check();
  await expect(page.getByText('$34.99').first()).toBeVisible();
  await page.getByTestId('add-to-cart').click();

  await page.getByRole('radio', { name: /small/i }).check();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByRole('button', { name: 'Open cart 2' })).toBeVisible();
  await page.evaluate(() => {
    document.getElementById('store-mobile-cart-trigger')?.click();
  });

  const cartDialog = page.getByRole('dialog', { name: /cart/i });
  await expect(cartDialog.getByText('Variant: Large', { exact: true })).toBeVisible();
  await expect(cartDialog.getByText('Variant: Small', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Open cart 2' })).toBeVisible();
  await page.evaluate(() => {
    document.getElementById('store-mobile-cart-trigger')?.click();
  });
  await expect(page.getByRole('dialog', { name: /cart/i }).getByText('Variant: Large', { exact: true }))
    .toBeVisible();
  await expect(page.getByRole('dialog', { name: /cart/i }).getByText('Variant: Small', { exact: true }))
    .toBeVisible();
});
