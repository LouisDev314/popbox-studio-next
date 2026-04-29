import type { Page } from '@playwright/test';
import { expect } from './fixtures';
import { e2eEnv } from './env';

export async function expectStripeCheckoutHandoff(page: Page): Promise<void> {
  await expect(page).toHaveURL(/https:\/\/checkout\.stripe\.com\/.+/, { timeout: 30_000 });
}

export async function completeStripeCheckoutIfEnabled(page: Page): Promise<void> {
  if (!e2eEnv.enableStripePayment) {
    return;
  }

  await page.getByLabel(/email/i).fill(e2eEnv.checkoutEmail);
  await page.getByLabel(/card number/i).fill('4242424242424242');
  await page.getByLabel(/expiration/i).fill('1234');
  await page.getByLabel(/cvc/i).fill('123');
  await page.getByLabel(/cardholder name|name on card/i).fill(`${e2eEnv.checkoutFirstName} ${e2eEnv.checkoutLastName}`);

  const country = page.getByLabel(/country|region/i);
  if (await country.count()) {
    await country.selectOption({ label: 'Canada' }).catch(() => undefined);
  }

  await page.getByLabel(/address/i).first().fill(e2eEnv.checkoutAddressLine1);
  await page.getByLabel(/city/i).fill(e2eEnv.checkoutCity);
  await page.getByLabel(/postal code|zip/i).fill(e2eEnv.checkoutPostalCode);
  await page.getByLabel(/phone/i).fill(e2eEnv.checkoutPhone).catch(() => undefined);
  await page.getByRole('button', { name: /pay|submit/i }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?session_id=/, { timeout: 90_000 });
}
