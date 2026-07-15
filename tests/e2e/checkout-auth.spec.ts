import { test, expect } from './fixtures/mock-services';

test('checkout sign-in handoff preserves the cart destination', async ({ page }) => {
  await page.goto('/account/sign-in?next=/cart');
  const createAccount = page.getByRole('link', { name: 'Create an account', exact: true });
  await expect(createAccount).toHaveAttribute('href', '/account/sign-up?next=%2Fcart');
  await createAccount.click();
  await expect(page).toHaveURL(/\/account\/sign-up\?next=%2Fcart$/);
});
