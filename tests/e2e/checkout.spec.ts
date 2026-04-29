import { expect, test } from './support/fixtures';
import { e2eEnv } from './support/env';
import { expectNoCriticalConsoleErrors } from './support/assertions';
import { addCurrentProductToCart, clearClientStore, openProduct } from './support/storefront';
import { completeStripeCheckoutIfEnabled, expectStripeCheckoutHandoff } from './support/stripe';

test.describe('checkout integration', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!e2eEnv.standardProductSlug, 'Set E2E_STANDARD_PRODUCT_SLUG to run checkout handoff coverage.');
    test.skip(testInfo.project.name !== 'desktop', 'Checkout handoff runs once in the desktop project to avoid duplicate reservations/orders.');
    await clearClientStore(page);
  });

  test('standard checkout creates a Stripe Checkout handoff', async ({ page, context, consoleErrors }) => {
    await openProduct(page, e2eEnv.standardProductSlug as string);
    await addCurrentProductToCart(page);

    await page.goto('/cart');
    await expect(page.getByTestId('cart-summary')).toBeVisible();
    await page.getByRole('button', { name: 'Check Out' }).last().click();

    await expectStripeCheckoutHandoff(page);

    if (!e2eEnv.enableStripePayment) {
      test.info().annotations.push({
        type: 'manual required',
        description: 'Stripe payment completion is skipped unless E2E_ENABLE_STRIPE_PAYMENT=true.',
      });
      await context.clearCookies();
      return;
    }

    await completeStripeCheckoutIfEnabled(page);
    await expect(page.getByRole('heading', { name: /thank you|checkout/i })).toBeVisible();
    await expect(page.getByText(/Order Details/i)).toBeVisible();
    await expectNoCriticalConsoleErrors(consoleErrors);
  });
});
