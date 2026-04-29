import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

const STACK_TRACE_PATTERNS = [
  /at\s+\w+\s+\(/i,
  /webpack-internal:/i,
  /node_modules/i,
  /Unhandled Runtime Error/i,
  /Application error/i,
];

export async function expectNoCriticalConsoleErrors(consoleErrors: string[]): Promise<void> {
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
}

export async function expectUsablePage(page: Page): Promise<void> {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.getByRole('link', { name: 'PopBox Studio' }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Application error|Failed to load chunk|Unhandled Runtime Error/i);
}

export async function expectNoStackTrace(locator: Locator): Promise<void> {
  const text = await locator.innerText();

  for (const pattern of STACK_TRACE_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

export async function expectPageMetadata(page: Page): Promise<void> {
  await expect(page).toHaveTitle(/.+/);
  const description = page.locator('head meta[name="description"]');
  await expect(description).toHaveAttribute('content', /.+/);
}

export async function expectSearchNoIndex(page: Page): Promise<void> {
  const robots = page.locator('head meta[name="robots"]');
  await expect(robots).toHaveAttribute('content', /noindex/i);
}

export async function expectProductImagesHaveAltText(page: Page): Promise<void> {
  const images = page.locator('img[src]:visible');
  const count = await images.count();

  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    const alt = await image.getAttribute('alt');
    const src = await image.getAttribute('src');

    if (!src || src.includes('logo') || src.includes('favicon')) {
      continue;
    }

    expect(alt ?? '').not.toEqual('');
  }
}
