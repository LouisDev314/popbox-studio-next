import { expect, test } from './support/fixtures';
import { e2eEnv } from './support/env';
import { expectNoCriticalConsoleErrors } from './support/assertions';
import { addCurrentProductToCart, clearClientStore, openProduct } from './support/storefront';
import { completeStripeCheckoutIfEnabled, expectStripeCheckoutHandoff } from './support/stripe';

test.describe('kuji checkout and ticket reveal', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!e2eEnv.kujiProductSlug, 'Set E2E_KUJI_PRODUCT_SLUG to run kuji checkout coverage.');
    test.skip(!e2eEnv.enableStripePayment, 'Set E2E_ENABLE_STRIPE_PAYMENT=true to run paid kuji ticket reveal coverage.');
    test.skip(testInfo.project.name !== 'desktop', 'Paid kuji checkout runs once in the desktop project to avoid duplicate paid orders.');
    await clearClientStore(page);
  });

  test('paid kuji order keeps tickets hidden until reveal and persists revealed state', async ({ page, consoleErrors }) => {
    await openProduct(page, e2eEnv.kujiProductSlug as string);
    await addCurrentProductToCart(page);

    await page.goto('/cart');
    await page.getByRole('button', { name: 'Check Out' }).last().click();
    await expectStripeCheckoutHandoff(page);
    await completeStripeCheckoutIfEnabled(page);

    await page.getByRole('link', { name: /Reveal My Tickets/i }).click();
    await expect(page.getByRole('heading', { name: 'Your Tickets' })).toBeVisible();

    const revealButton = page.getByRole('button', { name: /Reveal ticket for/i }).first();
    await expect(revealButton).toBeVisible();
    await expect(page.locator('[data-ticket-state="unrevealed"]').first()).toContainText(/Tap to reveal/i);
    await expect(page.locator('[data-ticket-state="unrevealed"]').first()).not.toContainText(/Congratulations/i);

    await revealButton.click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('heading', { name: 'Congratulations' })).toBeVisible();
    await page.getByRole('button', { name: /Back to tickets|View Results/i }).click();

    const remainingRevealButtons = await page.getByRole('button', { name: /Reveal ticket for/i }).count();
    if (remainingRevealButtons > 0) {
      await page.getByRole('button', { name: 'Reveal All' }).click();
      await page.getByRole('button', { name: 'Skip' }).click();
      await expect(page.getByRole('heading', { name: 'Congratulations' })).toBeVisible();
      await expect(page.locator('body')).toContainText(/Return/i);
      await page.getByRole('button', { name: 'Return' }).click();
    }

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your Tickets' })).toBeVisible();
    await expect(page.locator('[data-ticket-state="revealed"]').first()).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});

test.describe('manual kuji coverage', () => {
  test('refund flow after paid kuji/standard checkout', async () => {
    test.skip(true, 'Manual required unless Stripe test-mode refunds are explicitly confirmed safe for this backend.');
  });
});
