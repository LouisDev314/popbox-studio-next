import { test, expect } from './fixtures/mock-services';

test('sign-in keeps Google first and exposes accessible password visibility', async ({ page }) => {
  await page.goto('/account/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  const googleButton = page.getByRole('button', { name: 'Sign up with Google' });
  await expect(googleButton).toBeVisible();
  const password = page.locator('#sign-in-password');
  const googleBox = await googleButton.boundingBox();
  const emailBox = await page.getByLabel('Email').boundingBox();
  expect(googleBox?.y).toBeLessThan(emailBox?.y ?? 0);
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
});

test('auth pages do not overflow compact mobile widths', async ({ page }) => {
  for (const width of [320, 375, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/account/sign-up');
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);
  }
});

test('callback shows a safe error without reflecting query values', async ({ page }) => {
  await page.goto('/auth/callback?error_description=secret-provider-detail');
  await expect(page.getByText('This sign-in link is invalid or expired.')).toBeVisible();
  await expect(page.getByText('secret-provider-detail')).toHaveCount(0);
});
