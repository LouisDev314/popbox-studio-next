import type { ConsoleMessage, Locator, Page } from '@playwright/test';
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

async function dragProduct(page: Page, productName: string, targetRow: Locator, useTouch = false) {
  const handle = page.getByRole('button', { name: `Reorder ${productName}` });
  const [handleBox, targetBox] = await Promise.all([handle.boundingBox(), targetRow.boundingBox()]);

  if (!handleBox || !targetBox) throw new Error(`Unable to measure drag positions for ${productName}.`);

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;

  if (useTouch) {
    const dispatchTouch = async (type: 'touchstart' | 'touchmove' | 'touchend', x: number, y: number) => {
      await handle.evaluate((element, eventInit) => {
        const touch = new Touch({
          identifier: 1,
          target: element,
          clientX: eventInit.x,
          clientY: eventInit.y,
        });
        element.dispatchEvent(new TouchEvent(eventInit.type, {
          bubbles: true,
          cancelable: true,
          touches: eventInit.type === 'touchend' ? [] : [touch],
          targetTouches: eventInit.type === 'touchend' ? [] : [touch],
          changedTouches: [touch],
        }));
      }, { type, x, y });
    };

    await dispatchTouch('touchstart', startX, startY);
    await page.waitForTimeout(220);
    await dispatchTouch('touchmove', startX, startY - 12);
    await dispatchTouch(
      'touchmove',
      targetBox.x + Math.min(targetBox.width / 2, 120),
      targetBox.y + targetBox.height / 2,
    );
    await dispatchTouch(
      'touchend',
      targetBox.x + Math.min(targetBox.width / 2, 120),
      targetBox.y + targetBox.height / 2,
    );
    return;
  }

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY - 12, { steps: 3 });
  await page.mouse.move(
    targetBox.x + Math.min(targetBox.width / 2, 120),
    targetBox.y + targetBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
}

test('admin reorders then removes a Featured product without reloading', async ({ page }, testInfo) => {
  const console = recordUnexpectedConsoleErrors(page);
  let reorderRequestCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().endsWith('/api/v1/admin/collections/featured/order')) {
      reorderRequestCount += 1;
    }
  });
  await authenticateAdmin(page);
  await page.goto('/admin/collections/00000000-0000-4000-8000-000000000100');

  const orderSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Featured storefront order' }),
  });
  const orderList = orderSection.getByRole('list');
  await expect(orderList.getByRole('listitem').first()).toContainText('First Featured Figure');
  await dragProduct(
    page,
    'Final Featured Plush',
    orderList.getByRole('listitem').first(),
    testInfo.project.name === 'mobile',
  );
  await expect(orderList.getByRole('listitem').first()).toContainText('Final Featured Plush');
  await expect(page.getByText('Unsaved changes')).toBeVisible();
  expect(reorderRequestCount).toBe(0);

  await Promise.all([
    page.waitForResponse((response) => (
      response.request().method() === 'PUT'
      && response.url().endsWith('/api/v1/admin/collections/featured/order')
    )),
    page.getByRole('button', { name: 'Save order' }).click(),
  ]);
  await expect(page.getByText('Featured product order saved.')).toBeVisible();
  expect(reorderRequestCount).toBe(1);

  await page.getByRole('button', { name: 'Remove Second Featured Kuji from Featured' }).click();
  await Promise.all([
    page.waitForResponse((response) => (
      response.request().method() === 'PUT'
      && response.url().endsWith('/api/v1/admin/collections/featured/order')
    )),
    page.getByRole('button', { name: 'Save order' }).click(),
  ]);
  await expect(page.getByText(/Featured membership changed while you were editing/i)).toHaveCount(0);
  await expect(orderList.getByText('Second Featured Kuji')).toHaveCount(0);
  expect(reorderRequestCount).toBe(2);

  await page.reload();
  await expect(orderList.getByRole('listitem').first()).toContainText('Final Featured Plush');
  await expect(orderList.getByText('Second Featured Kuji')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/');
  const carouselProducts = page.locator('main section').first().locator('a[href^="/products/"]');
  await expect(carouselProducts).toHaveCount(9);
  expect(await carouselProducts.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([
    '/products/final-featured-plush',
    '/products/first-featured-figure',
    '/products/featured-acrylic-stand',
    '/products/featured-character-badge',
    '/products/featured-prize-kuji',
    '/products/featured-art-board',
    '/products/featured-mascot-plush',
    '/products/featured-towel-set',
    '/products/featured-anniversary-kuji',
  ]);
  const firstCarouselProduct = carouselProducts.first();
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

test('admin membership conflict preserves the draft until products are reloaded', async ({ authMock, page }, testInfo) => {
  await authenticateAdmin(page);
  await page.goto('/admin/collections/00000000-0000-4000-8000-000000000100');
  const orderList = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Featured storefront order' }),
  }).getByRole('list');
  await dragProduct(
    page,
    'Final Featured Plush',
    orderList.getByRole('listitem').nth(1),
    testInfo.project.name === 'mobile',
  );
  authMock.triggerFeaturedConflict();
  await expect(page.getByRole('button', { name: 'Save order' })).toBeEnabled();
  await Promise.all([
    page.waitForResponse((response) => (
      response.request().method() === 'PUT'
      && response.url().endsWith('/api/v1/admin/collections/featured/order')
    )),
    page.getByRole('button', { name: 'Save order' }).click(),
  ]);

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

test('admin can sort Featured products with the keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Keyboard sorting is covered in the desktop project.');
  await authenticateAdmin(page);
  await page.goto('/admin/collections/00000000-0000-4000-8000-000000000100');

  const orderSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Featured storefront order' }),
  });
  const orderList = orderSection.getByRole('list');
  const handle = page.getByRole('button', { name: 'Reorder Final Featured Plush' });
  await handle.focus();
  await expect(handle).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');

  await expect(orderList.getByRole('listitem').first()).toContainText('Final Featured Plush');
  await expect(page.getByText('Unsaved changes')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
