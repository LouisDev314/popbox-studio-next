import { test, expect } from './fixtures/mock-services';

test('account header hydrates into the signed-out control without console errors', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: 'Sign In / Create Account' })).toBeVisible();
  } else {
    await expect(page.getByRole('link', { name: 'Sign in or create an account' })).toBeVisible();
  }
  expect(consoleErrors).toEqual([]);
});

test('sign-in keeps Google first and exposes accessible password visibility', async ({ page }) => {
  await page.goto('/account/sign-in');
  await expect(page.getByRole('heading', { name: 'Login to your account' })).toBeVisible();
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

test('Google GIS exchanges an ID token without navigating through the Supabase project', async ({ page }) => {
  await page.goto('/account/sign-in?next=%2Faccount');
  const storefrontOrigin = new URL(page.url()).origin;

  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(page).toHaveURL(/\/account$/);
  expect(new URL(page.url()).origin).toBe(storefrontOrigin);
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
});

test('sign-in uses only generic submitted validation without native browser validation', async ({ page }) => {
  await page.goto('/account/sign-in');
  const form = page.locator('form[novalidate]');
  const email = page.getByLabel('Email');
  const password = page.getByLabel('Password', { exact: true });
  await expect(form).toHaveAttribute('novalidate', '');
  await expect(email).not.toHaveAttribute('required', '');
  await email.focus();
  await email.blur();
  await expect(page.getByText('Email is required.')).toHaveCount(0);
  await email.fill('not-an-email');
  await password.fill('x');
  await password.blur();
  await expect(page.getByText('Enter a valid email address.')).toHaveCount(0);
  await expect(page.getByText(/Password must/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#sign-in-form-error')).toHaveText('Incorrect email or password.');

  await email.fill('');
  await password.fill('');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#sign-in-form-error')).toHaveText('Incorrect email or password.');
  await expect(page.getByText('Email is required.')).toHaveCount(0);
  await expect(page.getByText('Password is required.')).toHaveCount(0);
});

test('all normal credential failures have one private error and raw provider text stays hidden', async ({ page }) => {
  for (const [email, password] of [
    ['unknown@example.com', 'wrong'],
    ['confirmed@example.com', 'wrong'],
    ['unconfirmed@example.com', 'valid123'],
  ]) {
    await page.goto('/account/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('#sign-in-form-error')).toHaveText('Incorrect email or password.');
    await expect(page.getByText(/Invalid login credentials|Email not confirmed|User not found/)).toHaveCount(0);
  }
});

test('clear service failures use the availability message', async ({ page }) => {
  await page.goto('/account/sign-in');
  await page.getByLabel('Email').fill('service@example.com');
  await page.getByLabel('Password', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('#sign-in-form-error')).toHaveText('Unable to sign in right now. Please try again.');
  await expect(page.getByText('raw upstream outage detail')).toHaveCount(0);
});

test('sign-up has one password input and a live password checklist', async ({ page }) => {
  await page.goto('/account/sign-up');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(1);
  await expect(page.getByLabel(/confirm password/i)).toHaveCount(0);
  const checklist = page.getByRole('list', { name: 'Password requirements' });
  const minimum = checklist.getByText('At least 8 characters').locator('..');
  const letter = checklist.getByText('Contains a letter').locator('..');
  const number = checklist.getByText('Contains a number').locator('..');
  await expect(minimum).toHaveAttribute('data-state', 'unmet');
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

test('signup confirmation callback reconciles the customer and restores the protected next route', async ({ page, authMock }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  authMock.reset();

  await page.goto('/account/sign-up?next=%2Faccount%2Forders');
  await page.getByLabel('Email').fill('confirmed@example.com');
  await page.getByLabel('Password', { exact: true }).fill('valid123');
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page).toHaveURL(/\/account\/check-email\?next=%2Faccount%2Forders$/);
  await expect(page.getByText('Open the email to activate your account.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Check Your Email' })).toBeVisible();

  await page.goto('/auth/callback?code=confirmed-code&next=%2Faccount%2Forders');
  await expect(page).toHaveURL(/\/account\/orders$/);
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  await expect(page.getByText('Open the email to activate your account.')).toHaveCount(0);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: 'My Orders' })).toBeVisible();
    await page.keyboard.press('Escape');
  } else {
    await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
  }
  expect(authMock.profileRequests).toBeGreaterThanOrEqual(2);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: 'My Orders' })).toBeVisible();
    await page.keyboard.press('Escape');
  } else {
    await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Open search' }).click();
  await expect(page.getByRole('dialog', { name: 'Search PopBox Studio products' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(consoleErrors).toEqual([]);
});

test('a successful callback cannot restore an external next destination', async ({ page }) => {
  await page.goto('/account/sign-up');
  const expectedOrigin = new URL(page.url()).origin;
  await page.getByLabel('Email').fill('confirmed@example.com');
  await page.getByLabel('Password', { exact: true }).fill('valid123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.goto('/auth/callback?code=confirmed-code&next=https%3A%2F%2Fevil.example');

  await expect(page).toHaveURL(/\/account$/);
  expect(new URL(page.url()).origin).toBe(expectedOrigin);
});
