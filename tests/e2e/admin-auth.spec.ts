import { test, expect } from './fixtures/mock-services';

test('admin login remains independent from storefront authentication', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in or create an account' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
});

test('stale admin shell can always log out and authenticate again', async ({ page, authMock }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  if (await page.getByRole('button', { name: 'Open navigation' }).isVisible()) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
  }
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.context().addCookies([{
    name: 'sb-127-auth-token',
    value: authMock.expiredSessionCookieValue(),
    url: new URL(page.url()).origin,
  }]);
  await page.route('http://127.0.0.1:4010/auth/v1/logout', (route) => route.abort());

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/admin\/login\?reason=unauthenticated$/);
  expect((await page.context().cookies()).filter(({ name }) => name.startsWith('sb-127-auth-token'))).toEqual([]);

  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
});
