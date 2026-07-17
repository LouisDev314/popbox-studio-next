import type { ConsoleMessage, Page } from '@playwright/test';
import { test, expect } from './fixtures/mock-services';

function recordUnexpectedConsoleErrors(page: Page) {
  const errors: string[] = [];
  const handleConsole = (message: ConsoleMessage) => {
    const isHydrationWarning = message.type() === 'warning' && /hydrat|server rendered|did not match/i.test(message.text());
    if (message.type() === 'error' || isHydrationWarning) errors.push(message.text());
  };

  page.on('console', handleConsole);
  return {
    errors,
    stop: () => page.off('console', handleConsole),
  };
}

async function authenticateAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
}

test('admin reorders Featured products and the storefront uses the persisted order', async ({ page }, testInfo) => {
  const console = recordUnexpectedConsoleErrors(page);
  await authenticateAdmin(page);
  await page.goto('/admin/collections/00000000-0000-4000-8000-000000000100');

  const orderSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Featured storefront order' }),
  });
  const orderList = orderSection.getByRole('list');
  await expect(orderList.getByRole('listitem').first()).toContainText('First Featured Figure');
  await page.getByRole('button', { name: 'Move Final Featured Plush up' }).click();
  await page.getByRole('button', { name: 'Move Final Featured Plush up' }).click();
  await expect(orderList.getByRole('listitem').first()).toContainText('Final Featured Plush');
  await expect(page.getByText('Unsaved changes')).toBeVisible();

  await page.getByRole('button', { name: 'Save order' }).click();
  await expect(page.getByText('Featured product order saved.')).toBeVisible();
  await page.reload();
  await expect(orderList.getByRole('listitem').first()).toContainText('Final Featured Plush');
  await expectNoHorizontalOverflow(page);

  await page.goto('/');
  const firstCarouselProduct = page.locator('main a[href^="/products/"]').first();
  await expect(firstCarouselProduct).toHaveAttribute('href', '/products/final-featured-plush');
  await expect(firstCarouselProduct).toContainText('Final Featured Plush');
  const carouselNavigation = testInfo.project.name === 'mobile'
    ? page.getByRole('button', { name: 'Go to slide 2' })
    : page.getByRole('button', { name: 'Next slide' });
  await expect(carouselNavigation).toBeEnabled();
  await carouselNavigation.click();
  await expectNoHorizontalOverflow(page);

  console.stop();
  expect(console.errors).toEqual([]);
});

test('admin membership conflict preserves the draft until products are reloaded', async ({ authMock, page }) => {
  await authenticateAdmin(page);
  await page.goto('/admin/collections/00000000-0000-4000-8000-000000000100');
  await page.getByRole('button', { name: 'Move Final Featured Plush up' }).click();
  authMock.triggerFeaturedConflict();
  await page.getByRole('button', { name: 'Save order' }).click();

  await expect(page.getByText(/Featured membership changed while you were editing/i)).toBeVisible();
  await expect(page.getByText('Unsaved changes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save order' })).toBeDisabled();

  await page.getByRole('button', { name: 'Reload Featured products' }).click();
  await expect(page.getByText(/Featured membership changed while you were editing/i)).toHaveCount(0);
  const orderSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Featured storefront order' }),
  });
  await expect(orderSection.getByRole('list').getByRole('listitem').first()).toContainText('First Featured Figure');
});
