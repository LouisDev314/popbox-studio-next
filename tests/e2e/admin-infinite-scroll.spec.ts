import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/mock-services';

async function authenticateAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
}

async function scrollToPageEnd(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
}

test('admin products append automatically, stop at the final page, and reset for search', async ({ page }) => {
  let secondPageRequests = 0;
  page.on('request', (request) => {
    const requestUrl = new URL(request.url());
    if (
      requestUrl.pathname === '/api/v1/admin/products'
      && requestUrl.searchParams.get('cursor') === 'catalog-page-2'
    ) {
      secondPageRequests += 1;
    }
  });
  await authenticateAdmin(page);

  await expect(page.getByText('First Featured Figure').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Beyond First Page Product')).toHaveCount(0);
  await scrollToPageEnd(page);
  await expect(page.getByText('Beyond First Page Product', { exact: true }).filter({ visible: true })).toBeVisible();
  expect(await page.getByText('Beyond First Page Product').count()).toBe(2);

  await scrollToPageEnd(page);
  await page.waitForTimeout(150);
  expect(secondPageRequests).toBe(1);

  await page.getByRole('searchbox', { name: 'Search products' }).fill('Beyond First Page Product');
  await page.getByRole('button', { name: /^Search$/ }).click();
  await expect(page).toHaveURL(/search=Beyond\+First\+Page\+Product/);
  await expect(page.getByText('Beyond First Page Product', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('First Featured Figure')).toHaveCount(0);
});

test('admin orders append automatically, stop at the final page, and reset for search', async ({ page }) => {
  let secondPageRequests = 0;
  page.on('request', (request) => {
    const requestUrl = new URL(request.url());
    if (
      requestUrl.pathname === '/api/v1/admin/orders'
      && requestUrl.searchParams.get('cursor') === 'orders-page-2'
    ) {
      secondPageRequests += 1;
    }
  });
  await authenticateAdmin(page);
  await page.goto('/admin/orders');

  await expect(page.getByText('PBX-ADMIN-001').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('PBX-ADMIN-026')).toHaveCount(0);
  await scrollToPageEnd(page);
  await expect(page.getByText('PBX-ADMIN-026').filter({ visible: true })).toBeVisible();
  expect(await page.getByText('PBX-ADMIN-026').count()).toBe(2);

  await scrollToPageEnd(page);
  await page.waitForTimeout(150);
  expect(secondPageRequests).toBe(1);

  await page.getByRole('searchbox', { name: 'Search orders' }).fill('Customer 26');
  await page.getByRole('button', { name: /^Search$/ }).click();
  await expect(page).toHaveURL(/search=Customer\+26/);
  await expect(page.getByText('PBX-ADMIN-026').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('PBX-ADMIN-001')).toHaveCount(0);
});
