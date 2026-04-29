import { loadE2eEnvFiles } from './env-file';

loadE2eEnvFiles();

function readBoolean(name: string, defaultValue = false): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value);
}

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export const e2eEnv = {
  baseUrl: readOptional('E2E_BASE_URL') || readOptional('NEXT_PUBLIC_SITE_URL') || 'http://127.0.0.1:3001',
  adminEmail: readOptional('E2E_ADMIN_EMAIL'),
  adminPassword: readOptional('E2E_ADMIN_PASSWORD'),
  standardProductSlug: readOptional('E2E_STANDARD_PRODUCT_SLUG'),
  kujiProductSlug: readOptional('E2E_KUJI_PRODUCT_SLUG'),
  soldOutProductSlug: readOptional('E2E_SOLD_OUT_PRODUCT_SLUG'),
  enableStripePayment: readBoolean('E2E_ENABLE_STRIPE_PAYMENT'),
  enableMutationTests: readBoolean('E2E_ENABLE_MUTATION_TESTS'),
  enableRefundTest: readBoolean('E2E_ENABLE_REFUND_TEST'),
  checkoutEmail: readOptional('E2E_CHECKOUT_EMAIL') || 'qa+e2e@popboxstudio.test',
  checkoutFirstName: readOptional('E2E_CHECKOUT_FIRST_NAME') || 'E2E',
  checkoutLastName: readOptional('E2E_CHECKOUT_LAST_NAME') || 'Tester',
  checkoutAddressLine1: readOptional('E2E_CHECKOUT_ADDRESS_LINE1') || '123 Queen St W',
  checkoutCity: readOptional('E2E_CHECKOUT_CITY') || 'Toronto',
  checkoutProvince: readOptional('E2E_CHECKOUT_PROVINCE') || 'ON',
  checkoutPostalCode: readOptional('E2E_CHECKOUT_POSTAL_CODE') || 'M5H 2N2',
  checkoutPhone: readOptional('E2E_CHECKOUT_PHONE') || '4165550100',
  runId: readOptional('E2E_RUN_ID') || `e2e-${Date.now()}`,
} as const;

export function hasAdminCredentials(): boolean {
  return Boolean(e2eEnv.adminEmail && e2eEnv.adminPassword);
}
