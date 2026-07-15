import { test, expect } from './fixtures/mock-services';

test('sign-in keeps Google first and exposes accessible password visibility', async ({ page }) => {
  await page.goto('/account/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  const googleButton = page.getByRole('button', { name: 'Continue with Google' });
  await expect(googleButton).toBeVisible();
  await expect(page.getByText('or', { exact: true })).toBeVisible();
  const password = page.locator('#sign-in-password');
  const googleBox = await googleButton.boundingBox();
  const dividerBox = await page.getByText('or', { exact: true }).boundingBox();
  const emailBox = await page.getByLabel('Email').boundingBox();
  expect(googleBox?.y).toBeLessThan(dividerBox?.y ?? 0);
  expect(dividerBox?.y).toBeLessThan(emailBox?.y ?? 0);
  expect(googleBox?.y).toBeLessThan(emailBox?.y ?? 0);
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
});

test('auth validation appears after blur without native browser validation', async ({ page }) => {
  await page.goto('/account/sign-in');
  const form = page.locator('form[novalidate]');
  const email = page.getByLabel('Email');
  await expect(form).toHaveAttribute('novalidate', '');
  await expect(email).not.toHaveAttribute('required', '');
  await email.focus();
  await email.blur();
  await expect(page.getByText('Email is required.')).toBeVisible();
  await email.fill('customer@example.com');
  await expect(page.getByText('Email is required.')).toHaveCount(0);
});

test('sign-up has one password input and a live password checklist', async ({ page }) => {
  await page.goto('/account/sign-up');
  await expect(page.locator('input[type="password"]')).toHaveCount(1);
  await expect(page.getByLabel(/confirm password/i)).toHaveCount(0);
  const checklist = page.getByRole('list', { name: 'Password requirements' });
  const minimum = checklist.getByText('At least 8 characters').locator('..');
  const letter = checklist.getByText('Contains a letter').locator('..');
  const number = checklist.getByText('Contains a number').locator('..');
  await expect(minimum).toHaveAttribute('data-state', 'neutral');
  const password = page.locator('#sign-up-password');
  await password.fill('abcdefgh');
  await expect(minimum).toHaveAttribute('data-state', 'met');
  await expect(letter).toHaveAttribute('data-state', 'met');
  await expect(number).toHaveAttribute('data-state', 'unmet');
  await password.fill('abcdefgh1');
  await expect(number).toHaveAttribute('data-state', 'met');
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
