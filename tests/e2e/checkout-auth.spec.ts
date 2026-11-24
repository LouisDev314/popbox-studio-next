import { test, expect } from './fixtures/mock-services';

test('checkout sign-in handoff preserves the cart destination', async ({ page }) => {
  await page.goto('/account/sign-in?next=/cart');
  const createAccount = page.getByRole('link', { name: 'Create an account', exact: true });
  await expect(createAccount).toHaveAttribute('href', '/account/sign-up?next=%2Fcart');
  await createAccount.click();
  await expect(page).toHaveURL(/\/account\/sign-up\?next=%2Fcart$/);
});

test('manual confirmation survives a reload with the same checkout draft and requires a current quote', async ({ page }) => {
  const drafts: string[] = [];
  let sessionBody: Record<string, unknown> | undefined;

  await page.route('**/api/v1/checkout/quote', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    drafts.push(body.checkoutDraftId);
    if (!body.confirmedAddress) {
      return route.fulfill({ status: 422, json: {
        code: 422,
        message: 'Confirm the shipping address you entered.',
        success: false,
        errors: { code: 'ADDRESS_MANUAL_CONFIRMATION_REQUIRED', addressProof: 'manual-proof', failure: 'quota' },
      } });
    }
    expect(body.addressProof).toBe('manual-proof');
    return route.fulfill({ json: {
      code: 200, message: 'Checkout quote calculated', success: true, status: 'success',
      data: {
        subtotalCents: 2499, shippingCents: 1200, taxCents: 185, totalCents: 3884,
        addressValidationStatus: 'unverified', addressProof: 'priced-proof', expiresAt: new Date(Date.now() + 600_000).toISOString(),
        taxBreakdown: { countryCode: 'CA', provinceCode: 'AB', taxableAmountCents: 3699, gstCents: 185, pstCents: 0, hstCents: 0, qstCents: 0 },
      },
    } });
  });
  await page.route('**/api/v1/checkout/session', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    sessionBody = route.request().postDataJSON();
    expect(route.request().headers()['idempotency-key']).toMatch(/^checkout-/);
    return route.fulfill({ status: 201, json: {
      code: 201, message: 'Checkout session created', success: true, status: 'success',
      data: { checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_address_resilience', sessionId: 'cs_test_address_resilience' },
    } });
  });
  await page.route('https://checkout.stripe.com/pay/cs_test_address_resilience', (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: '<title>Fixture payment page</title>',
  }));

  await page.goto('/products/first-featured-figure');
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByRole('button', { name: 'Open cart 1' })).toBeVisible();
  await page.goto('/cart');

  const fillAddress = async () => {
    await page.getByLabel('Email', { exact: true }).fill('guest@example.com');
    await page.getByLabel('Full name', { exact: true }).fill('Test Buyer');
    await page.getByLabel('Street address', { exact: true }).fill('123 Test Street');
    await page.getByLabel('City', { exact: true }).fill('Calgary');
    await page.getByLabel('Province', { exact: true }).selectOption('AB');
    await page.getByLabel('Postal code', { exact: true }).fill('T2P 1J9');
  };
  await fillAddress();
  await expect(page.getByRole('button', { name: 'Confirm entered address' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check Out', exact: true })).toBeDisabled();
  const firstDraft = drafts[0];
  expect(firstDraft).toMatch(/^[0-9a-f-]{36}$/i);

  await page.reload();
  await fillAddress();
  await page.getByRole('button', { name: 'Confirm entered address' }).click();
  await expect(page.getByText('We’ll review this address before shipping.')).toBeVisible();
  expect(drafts.every((draft) => draft === firstDraft)).toBe(true);
  expect(sessionBody).toBeUndefined();
  await page.getByRole('button', { name: 'Check Out', exact: true }).click();
  await expect(page).toHaveTitle('Fixture payment page');
  expect(sessionBody).toMatchObject({ checkoutDraftId: firstDraft, addressProof: 'priced-proof' });
  expect(sessionBody).not.toHaveProperty('confirmedAddress');
});
