import { test, expect } from './fixtures/mock-services';

test('protected account pages preserve the exact safe next destination', async ({ page }) => {
  await page.goto('/account/orders');
  await expect(page).toHaveURL(/\/account\/sign-in\?next=%2Faccount%2Forders$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('unsafe next destinations fall back to the account root', async ({ page }) => {
  await page.goto('/account/sign-in?next=https://evil.example');
  await expect(page.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/account/sign-up?next=%2Faccount');
});
