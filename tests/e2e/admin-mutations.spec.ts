import { expect, test } from './support/fixtures';
import { e2eEnv, hasAdminCredentials } from './support/env';
import { expectNoCriticalConsoleErrors } from './support/assertions';
import { loginAsAdmin } from './support/admin';

test.describe.configure({ mode: 'serial' });

test.describe('admin mutation flows', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!e2eEnv.enableMutationTests, 'Set E2E_ENABLE_MUTATION_TESTS=true to run admin mutation coverage.');
    test.skip(!hasAdminCredentials(), 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin mutation coverage.');
    test.skip(testInfo.project.name !== 'desktop', 'Mutation tests run only once in the desktop project to avoid duplicate pre-prod writes.');
    await loginAsAdmin(page);
  });

  test('collections can be created and edited with e2e-prefixed data', async ({ page, consoleErrors }) => {
    const name = `${e2eEnv.runId} collection`;
    const editedName = `${name} edited`;
    const slug = `${e2eEnv.runId}-collection`;

    await page.goto('/admin/collections');
    await page.getByRole('button', { name: 'New Collection' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input').nth(0).fill(name);
    await dialog.locator('input').nth(1).fill(slug);
    await dialog.locator('textarea').fill('E2E collection created by Playwright.');
    await dialog.locator('input').nth(2).fill('9999');
    await dialog.locator('select').selectOption('true');
    await dialog.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText(name)).toBeVisible();
    await page.getByRole('row').filter({ hasText: name }).getByRole('button').click();
    await expect(dialog).toBeVisible();
    await dialog.locator('input').nth(0).fill(editedName);
    await dialog.locator('select').selectOption('false');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText(editedName)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: editedName })).toContainText('Hidden');
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('tags can be created and edited with e2e-prefixed data', async ({ page, consoleErrors }) => {
    const name = `${e2eEnv.runId} tag`;
    const editedName = `${name} edited`;
    const slug = `${e2eEnv.runId}-tag`;

    await page.goto('/admin/tags');
    await page.getByRole('button', { name: 'New Tag' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('select').selectOption('category');
    await dialog.locator('input').nth(0).fill(name);
    await dialog.locator('input').nth(1).fill(slug);
    await dialog.getByRole('button', { name: 'Save Tag' }).click();

    await expect(page.getByText(name)).toBeVisible();
    await page.getByRole('row').filter({ hasText: name }).getByRole('button').click();
    await expect(dialog).toBeVisible();
    await dialog.locator('input').nth(0).fill(editedName);
    await dialog.getByRole('button', { name: 'Save Tag' }).click();

    await expect(page.getByText(editedName)).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('shipping settings can be updated, reflected publicly, and restored', async ({ page, consoleErrors }) => {
    await page.goto('/admin/settings/shipping');

    const flatRate = page.getByLabel('Flat shipping rate');
    const freeThreshold = page.getByLabel('Free shipping threshold');
    const originalFlatRate = await flatRate.inputValue();
    const originalFreeThreshold = await freeThreshold.inputValue();

    await flatRate.fill('12.34');
    await freeThreshold.fill('123.45');
    await page.getByRole('button', { name: 'Save shipping settings' }).click();
    await expect(page.getByText('Shipping settings saved.')).toBeVisible();

    await page.goto('/legal/shipping-returns');
    await expect(page.getByText('$12.34 CAD')).toBeVisible();
    await expect(page.getByText('$123.45 CAD')).toBeVisible();

    await page.goto('/admin/settings/shipping');
    await page.getByLabel('Flat shipping rate').fill(originalFlatRate);
    await page.getByLabel('Free shipping threshold').fill(originalFreeThreshold);
    await page.getByRole('button', { name: 'Save shipping settings' }).click();
    await expect(page.getByText('Shipping settings saved.')).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });

  test('store banner can be updated, reflected publicly, and restored', async ({ page, consoleErrors }) => {
    const message = `${e2eEnv.runId} banner`;

    await page.goto('/admin/settings/store-banner');

    const enabledSwitch = page.locator('#store-banner-enabled');
    const wasEnabled = await enabledSwitch.getAttribute('aria-checked');
    const itemCount = await page.locator('textarea[id^="store-banner-message-"]').count();
    const originalFirstMessage = itemCount > 0
      ? await page.locator('textarea[id^="store-banner-message-"]').first().inputValue()
      : null;
    const originalFirstLink = itemCount > 0
      ? await page.locator('input[id^="store-banner-link-href-"]').first().inputValue()
      : null;

    if (wasEnabled !== 'true') {
      await enabledSwitch.click();
    }

    if (itemCount >= 5) {
      await page.locator('textarea[id^="store-banner-message-"]').first().fill(message);
      await page.locator('input[id^="store-banner-link-href-"]').first().fill('/products');
    } else {
      await page.getByRole('button', { name: 'Add banner item' }).click();
      await page.locator('textarea[id^="store-banner-message-"]').last().fill(message);
      await page.locator('input[id^="store-banner-link-href-"]').last().fill('/products');
    }

    await page.getByRole('button', { name: 'Save store banner' }).click();
    await expect(page.getByText('Store banner settings saved.')).toBeVisible();

    await page.goto('/');
    await expect(page.getByLabel('Store announcement')).toContainText(message);

    await page.goto('/admin/settings/store-banner');
    if (itemCount >= 5) {
      await page.locator('textarea[id^="store-banner-message-"]').first().fill(originalFirstMessage ?? '');
      await page.locator('input[id^="store-banner-link-href-"]').first().fill(originalFirstLink ?? '');
    } else {
      await page.getByRole('button', { name: `Remove item ${itemCount + 1}` }).click();
    }

    const restoredSwitch = page.locator('#store-banner-enabled');
    const isEnabledAfterTest = await restoredSwitch.getAttribute('aria-checked');
    if (wasEnabled !== isEnabledAfterTest) {
      await restoredSwitch.click();
    }

    await page.getByRole('button', { name: 'Save store banner' }).click();
    await expect(page.getByText('Store banner settings saved.')).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});

test.describe('manual admin mutation coverage', () => {
  test('standard product image upload, active storefront reflection, edit, and archive', async () => {
    test.skip(true, 'Manual required unless the pre-prod admin exposes stable product creation/upload selectors and safe archive policy.');
  });

  test('kuji product prize creation, image replacement, activation, and cleanup', async () => {
    test.skip(true, 'Manual required unless the pre-prod admin exposes stable kuji prize image upload selectors and safe cleanup policy.');
  });
});
