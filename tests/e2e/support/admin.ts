import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import { e2eEnv, hasAdminCredentials } from './env';

export async function loginAsAdmin(page: Page): Promise<void> {
  if (!hasAdminCredentials()) {
    throw new Error('Admin credentials are required for this E2E helper.');
  }

  await page.goto('/admin/login');
  await page.getByPlaceholder('Email address').fill(e2eEnv.adminEmail as string);
  await page.getByPlaceholder('Password').fill(e2eEnv.adminPassword as string);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/products/);
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
}

export async function expectAdminPageUsable(page: Page, path: string, heading: string | RegExp): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Failed to load|Application error|Unhandled Runtime Error/i);
}
