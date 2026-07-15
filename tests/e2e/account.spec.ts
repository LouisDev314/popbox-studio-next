import type { APIRequestContext, ConsoleMessage, Page } from '@playwright/test';
import { test, expect } from './fixtures/mock-services';

const PROTECTED_ACCOUNT_PATHS = [
  '/account',
  '/account/orders',
  '/account/orders/test-order',
  '/account/kuji',
];

function recordUnexpectedConsoleErrors(page: Page) {
  const errors: string[] = [];
  const handleConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  };

  page.on('console', handleConsole);

  return {
    errors,
    stop: () => page.off('console', handleConsole),
  };
}

async function expectOverlayStateClean(page: Page) {
  const state = await page.evaluate(() => ({
    bodyAriaHidden: document.body.getAttribute('aria-hidden'),
    bodyInert: document.body.hasAttribute('inert'),
    bodyOverflow: document.body.style.overflow,
    bodyPointerEvents: document.body.style.pointerEvents,
    bodyTouchAction: document.body.style.touchAction,
    htmlOverflow: document.documentElement.style.overflow,
    openDrawers: document.querySelectorAll(
      '[data-slot="storefront-drawer-panel"][aria-hidden="false"]',
    ).length,
    pointerBlockingDrawerOverlays: Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="storefront-drawer-overlay"]'),
    ).filter((element) => getComputedStyle(element).pointerEvents !== 'none').length,
    visibleModalDialogs: Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
      .filter((element) => (
        element.getAttribute('aria-hidden') !== 'true'
        && !element.hasAttribute('inert')
        && getComputedStyle(element).pointerEvents !== 'none'
      )).length,
  }));

  expect(state).toEqual({
    bodyAriaHidden: null,
    bodyInert: false,
    bodyOverflow: '',
    bodyPointerEvents: '',
    bodyTouchAction: '',
    htmlOverflow: '',
    openDrawers: 0,
    pointerBlockingDrawerOverlays: 0,
    visibleModalDialogs: 0,
  });
}

async function exerciseHeaderOverlays(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });

  const searchTrigger = page.getByRole('button', { name: 'Open search' });
  await expect(searchTrigger).toBeEnabled();
  await searchTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Search PopBox Studio products' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search PopBox Studio products' })).toBeHidden();
  await expect(searchTrigger).toBeFocused();
  await expectOverlayStateClean(page);

  const wishlistTrigger = page.getByRole('button', { name: 'Open wishlist' });
  await expect(wishlistTrigger).toBeEnabled();
  await wishlistTrigger.click();
  await expect(page.getByRole('dialog', { name: /Wishlist/ })).toBeVisible();
  await page.mouse.click(10, 500);
  await expect(page.getByRole('dialog', { name: /Wishlist/ })).toBeHidden();
  await expect(wishlistTrigger).toBeFocused();
  await expectOverlayStateClean(page);

  const cartTrigger = page.getByRole('button', { name: 'Open cart' });
  await expect(cartTrigger).toBeEnabled();
  await cartTrigger.click();
  await expect(page.getByRole('dialog', { name: /Cart/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Cart/ })).toBeHidden();
  await expect(cartTrigger).toBeFocused();
  await expectOverlayStateClean(page);

  const accountTrigger = page.getByRole('link', { name: 'Sign in or create an account' });
  await expect(accountTrigger).toBeVisible();
  await expect(accountTrigger).toHaveAttribute('href', /\/account\/sign-in\?next=/);
  const expectedNext = new URL(page.url()).searchParams.get('next');
  if (expectedNext) {
    await accountTrigger.press('Enter');
    expect(new URL(page.url()).searchParams.get('next')).toBe(expectedNext);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const menuTrigger = page.getByRole('button', { name: 'Open menu' });
  await expect(menuTrigger).toBeEnabled();
  await menuTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Store navigation menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Store navigation menu' })).toBeHidden();
  await expect(menuTrigger).toBeFocused();
  await expectOverlayStateClean(page);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
}

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
  await page.goto(path);
  const url = new URL(page.url());

  expect(url.pathname).toBe('/account/sign-in');
  expect(url.searchParams.get('next')).toBe(path);
  await expect(page.locator('form[novalidate]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Account' })).toHaveCount(0);
  await expect(page.getByText(path, { exact: true })).toHaveCount(0);
}

test('signed-out account routes redirect before protected account UI renders', async ({ page, request }) => {
  const console = recordUnexpectedConsoleErrors(page);

  for (const path of PROTECTED_ACCOUNT_PATHS) {
    await expectServerRedirect(request, path);
    await expectBrowserRedirect(page, path);
  }

  console.stop();
  expect(console.errors).toEqual([]);
});

test('header overlays remain interactive after every signed-out account redirect', async ({ page }) => {
  const console = recordUnexpectedConsoleErrors(page);

  for (const path of PROTECTED_ACCOUNT_PATHS) {
    await expectBrowserRedirect(page, path);
    await exerciseHeaderOverlays(page);
    expect(new URL(page.url()).searchParams.get('next')).toBe(path);
  }

  console.stop();
  expect(console.errors).toEqual([]);
});

test('direct sign-in navigation leaves all header overlays interactive', async ({ page }) => {
  const console = recordUnexpectedConsoleErrors(page);

  await page.goto('/account/sign-in');
  await expect(page.locator('form[novalidate]')).toBeVisible();
  await exerciseHeaderOverlays(page);

  console.stop();
  expect(console.errors).toEqual([]);
});

test('route changes close header overlays and release their interaction locks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Sign in or create an account' }).click();
  await expect(page).toHaveURL(/\/account\/sign-in\?next=%2F$/);

  const cartTrigger = page.getByRole('button', { name: 'Open cart' });
  await cartTrigger.click();
  await expect(page.getByRole('dialog', { name: /Cart/ })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('dialog', { name: /Cart/ })).toBeHidden();
  await expectOverlayStateClean(page);
  await expect(page.getByRole('button', { name: 'Open search' })).toBeEnabled();
});

test('unsafe next destinations fall back to the account root', async ({ page }) => {
  await page.goto('/account/sign-in?next=https://evil.example');
  await expect(page.getByRole('link', { name: 'Create an account', exact: true })).toHaveAttribute('href', '/account/sign-up?next=%2Faccount');
});
