import { expect, test } from './support/fixtures';
import { e2eEnv, hasAdminCredentials } from './support/env';
import { expectNoCriticalConsoleErrors } from './support/assertions';
import { expectAdminPageUsable, loginAsAdmin } from './support/admin';

test.describe('admin authentication and read-only admin pages', () => {
  test('unauthenticated admin users are redirected to login', async ({ page, consoleErrors }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto('/admin/products');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('admin login works and core admin pages load', async ({ page, consoleErrors }) => {
    test.skip(!hasAdminCredentials(), 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin login coverage.');

    await loginAsAdmin(page);

    await expectAdminPageUsable(page, '/admin/products', 'Products');
    await expectAdminPageUsable(page, '/admin/collections', 'Collections');
    await expectAdminPageUsable(page, '/admin/tags', 'Tags');
    await expectAdminPageUsable(page, '/admin/orders', 'Orders');
    await expectAdminPageUsable(page, '/admin/settings/shipping', 'Shipping Settings');
    await expectAdminPageUsable(page, '/admin/settings/store-banner', 'Store Banner');
    await expectAdminPageUsable(page, '/admin/legal', /Legal|Content/i);

    await expect(page.locator('body')).not.toContainText(e2eEnv.adminPassword as string);
    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});
