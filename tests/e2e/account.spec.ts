import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './fixtures/mock-services';

async function expectServerRedirect(request: APIRequestContext, path: string) {
  const response = await request.get(path, { maxRedirects: 0 });
  const location = new URL(response.headers().location, 'http://localhost:3001');
  const body = await response.text();

  expect(response.status()).toBe(307);
  expect(location.pathname).toBe('/account/sign-in');
  expect(location.searchParams.get('next')).toBe(path);
  expect(location.pathname).not.toContain('/admin');
  expect(body).not.toContain('aria-label="Account"');
}

async function expectBrowserRedirect(page: Page, path: string) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(path);
  const url = new URL(page.url());

  expect(url.pathname).toBe('/account/sign-in');
  expect(url.searchParams.get('next')).toBe(path);
  await expect(page.locator('form[novalidate]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Account' })).toHaveCount(0);
  await expect(page.getByText(path, { exact: true })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
}

test('signed-out account routes redirect before protected account UI renders', async ({ page, request }) => {
  for (const path of ['/account', '/account/orders', '/account/orders/test-order', '/account/kuji']) {
    await expectServerRedirect(request, path);
    await expectBrowserRedirect(page, path);
  }
});

test('unsafe next destinations fall back to the account root', async ({ page }) => {
  await page.goto('/account/sign-in?next=https://evil.example');
  await expect(page.getByRole('link', { name: 'Create an account', exact: true })).toHaveAttribute('href', '/account/sign-up?next=%2Faccount');
});
