import { test, expect } from './fixtures/mock-services';

test('checkout sign-in handoff preserves the cart destination', async ({ page }) => {
  await page.goto('/account/sign-in?next=/cart');
  await expect(page.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/account/sign-up?next=%2Fcart');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/account\/sign-up\?next=%2Fcart$/);
});
