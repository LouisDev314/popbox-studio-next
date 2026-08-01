import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures/mock-services';

const featuredId = '00000000-0000-4000-8000-000000000100';
const kujiPicksId = '00000000-0000-4000-8000-000000000101';
const newArrivalsId = '00000000-0000-4000-8000-000000000102';

async function authenticateAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
}

function collectionItems(page: Page, mobile: boolean) {
  const layout = page.getByTestId(
    mobile ? 'admin-collections-mobile-list' : 'admin-collections-desktop-table',
  );
  return mobile ? layout.locator('article') : layout.locator('tbody tr');
}

async function dragCollection(
  page: Page,
  collectionName: string,
  target: Locator,
  useTouch: boolean,
) {
  const handle = page.getByRole('button', { name: `Reorder ${collectionName}` });
  const [handleBox, targetBox] = await Promise.all([handle.boundingBox(), target.boundingBox()]);

  if (!handleBox || !targetBox) throw new Error(`Unable to measure collection drag for ${collectionName}.`);

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const targetX = targetBox.x + Math.min(targetBox.width / 2, 120);
  const targetY = targetBox.y + targetBox.height / 2;

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
    await dispatchTouch('touchmove', targetX, targetY);
    await dispatchTouch('touchend', targetX, targetY);
    return;
  }

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY - 12, { steps: 3 });
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
}

test('collection handle reorders, persists every raw ID, and survives reload', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  let persistedPayload: unknown;
  page.on('request', (request) => {
    if (
      request.method() === 'PATCH'
      && request.url().endsWith('/api/v1/admin/collections/reorder')
    ) {
      persistedPayload = request.postDataJSON();
    }
  });

  await authenticateAdmin(page);
  await page.goto('/admin/collections');
  const items = collectionItems(page, mobile);
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Featured');
  await expect(items.nth(1)).toContainText('Kuji Picks');
  await expect(items.nth(2)).toContainText('New Arrivals');

  const manageLink = page.getByRole('link', { name: 'Manage products' }).first();
  await expect(manageLink).toHaveAttribute('href', `/admin/collections/${featuredId}`);
  await page.getByRole('button', { name: 'Edit' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Edit Collection');
  await expect(dialog.getByText(/sort order/i)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  const reorderResponse = page.waitForResponse((response) => (
    response.request().method() === 'PATCH'
    && response.url().endsWith('/api/v1/admin/collections/reorder')
  ));
  await dragCollection(page, 'New Arrivals', items.first(), mobile);
  await reorderResponse;

  await expect(items.first()).toContainText('New Arrivals');
  expect(persistedPayload).toEqual({
    collectionIds: [newArrivalsId, featuredId, kujiPicksId],
  });
  await expect(page.getByText('Collection order saved.')).toBeVisible();

  await page.reload();
  await expect(collectionItems(page, mobile).first()).toContainText('New Arrivals');
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
});

test('keyboard sorting persists while non-handle dragging remains inert', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop covers pointer and keyboard input; mobile covers touch.');
  let reorderRequests = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'PATCH'
      && request.url().endsWith('/api/v1/admin/collections/reorder')
    ) {
      reorderRequests += 1;
    }
  });

  await authenticateAdmin(page);
  await page.goto('/admin/collections');
  const items = collectionItems(page, false);
  const slug = items.nth(2).getByText('new-arrivals');
  const [slugBox, targetBox] = await Promise.all([slug.boundingBox(), items.first().boundingBox()]);
  if (!slugBox || !targetBox) throw new Error('Unable to measure non-handle collection content.');

  await page.mouse.move(slugBox.x + slugBox.width / 2, slugBox.y + slugBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 180, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect(reorderRequests).toBe(0);
  await expect(items.first()).toContainText('Featured');

  const reorderResponse = page.waitForResponse((response) => (
    response.request().method() === 'PATCH'
    && response.url().endsWith('/api/v1/admin/collections/reorder')
  ));
  const handle = page.getByRole('button', { name: 'Reorder New Arrivals' });
  await handle.focus();
  await expect(handle).toBeFocused();
  await handle.press('Space');
  await handle.press('ArrowUp');
  await handle.press('ArrowUp');
  await handle.press('Space');
  await reorderResponse;

  await expect(items.first()).toContainText('New Arrivals');
  expect(reorderRequests).toBe(1);
});
