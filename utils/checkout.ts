import { z } from 'zod';
import {
  type ICartItem,
  type ICartInvalidItem,
} from '@/interfaces/cart';
import {
  type CanadianProvinceCode,
  type CheckoutCustomerInput,
  type CheckoutValidationResult,
  type CheckoutRequestBody,
  type ShippingAddress,
  type SuggestedShippingAddress,
} from '@/interfaces/checkout';
import { IOrderDetail, IOrderStatus } from '@/interfaces/order';

const FINALIZED_CHECKOUT_ORDER_STATUSES = new Set<IOrderStatus>([
  'paid',
  'packed',
  'shipped',
  'paid_needs_attention',
]);

export const CANADIAN_PROVINCES: Array<{
  code: CanadianProvinceCode;
  label: string;
}> = [
  { code: 'AB', label: 'Alberta' },
  { code: 'BC', label: 'British Columbia' },
  { code: 'MB', label: 'Manitoba' },
  { code: 'NB', label: 'New Brunswick' },
  { code: 'NL', label: 'Newfoundland and Labrador' },
  { code: 'NS', label: 'Nova Scotia' },
  { code: 'NT', label: 'Northwest Territories' },
  { code: 'NU', label: 'Nunavut' },
  { code: 'ON', label: 'Ontario' },
  { code: 'PE', label: 'Prince Edward Island' },
  { code: 'QC', label: 'Quebec' },
  { code: 'SK', label: 'Saskatchewan' },
  { code: 'YT', label: 'Yukon' },
];

const CANADIAN_PROVINCE_CODES = new Set(CANADIAN_PROVINCES.map((province) => province.code));

export function isCanadianProvinceCode(value: string): value is CanadianProvinceCode {
  return CANADIAN_PROVINCE_CODES.has(value as CanadianProvinceCode);
}

function trimRequired(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function trimOptional(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim() ?? '';

  return trimmedValue || null;
}

function normalizeProvinceCode(value: string | null | undefined): string {
  return trimRequired(value).toUpperCase();
}

function normalizeCountryCode(value: string | null | undefined): string {
  return trimRequired(value).toUpperCase();
}

function normalizeComparableText(value: string | null | undefined): string {
  return trimRequired(value)
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparableProvince(value: string | null | undefined): string {
  return trimRequired(value).toUpperCase();
}

function normalizeComparablePostalCode(value: string | null | undefined): string {
  return trimRequired(value).toUpperCase().replace(/\s+/g, '');
}

type ComparableShippingAddress = Pick<
    CheckoutCustomerInput['shippingAddress'] | ShippingAddress,
    'city' | 'countryCode' | 'line1' | 'postalCode' | 'province'
  > & { line2?: string | null };

export function areShippingAddressesEquivalent(
  firstAddress: ComparableShippingAddress,
  secondAddress: ComparableShippingAddress,
): boolean {
  return (
    normalizeComparableText(firstAddress.line1) === normalizeComparableText(secondAddress.line1)
    && normalizeComparableText(firstAddress.line2) === normalizeComparableText(secondAddress.line2)
    && normalizeComparableText(firstAddress.city) === normalizeComparableText(secondAddress.city)
    && normalizeComparableProvince(firstAddress.province) === normalizeComparableProvince(secondAddress.province)
    && normalizeComparablePostalCode(firstAddress.postalCode) === normalizeComparablePostalCode(secondAddress.postalCode)
    && normalizeCountryCode(firstAddress.countryCode) === normalizeCountryCode(secondAddress.countryCode)
  );
}

export function shouldConfirmSuggestedAddress(
  submittedAddress: ComparableShippingAddress,
  suggestedAddress: SuggestedShippingAddress,
): boolean {
  return !areShippingAddressesEquivalent(submittedAddress, suggestedAddress);
}

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20),
});

const checkoutRequestSchema = z.object({
  billingSameAsShipping: z.literal(true),
  confirmedAddress: z.literal(true).optional(),
  customerNote: z.string().trim().max(200, 'Customer note must be 200 characters or fewer.').nullable().optional(),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  firstName: z.string().trim().min(1).max(120).nullable().optional(),
  lastName: z.string().trim().min(1).max(120).nullable().optional(),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
  items: z.array(checkoutItemSchema).min(1).max(50),
  shippingAddress: z.object({
    fullName: z.string().trim().min(1, 'Full name is required.').max(240),
    line1: z.string().trim().min(1, 'Street address is required.').max(240),
    line2: z.string().trim().max(240).nullable().optional(),
    city: z.string().trim().min(1, 'City is required.').max(120),
    province: z.string()
      .trim()
      .min(1, 'Province is required.')
      .max(80)
      .refine(isCanadianProvinceCode, 'Choose a Canadian province or territory.'),
    postalCode: z.string().trim().min(1, 'Postal code is required.').max(20),
    countryCode: z.string()
      .trim()
      .length(2)
      .refine((value) => value === 'CA', 'Country must be Canada.'),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
  }),
});

const STRIPE_CHECKOUT_HOSTNAME = 'checkout.stripe.com';
const INVALID_CHECKOUT_URL_MESSAGE =
  'We couldn’t start checkout because the payment link was invalid. Please try again.';

export function isFinalizedCheckoutOrder(order: IOrderDetail): boolean {
  return FINALIZED_CHECKOUT_ORDER_STATUSES.has(order.status);
}

export function getPurchasedProductIdsFromOrder(order: IOrderDetail): string[] {
  return [...new Set(order.items.map((item) => item.productId))];
}

export function getInvalidCartItemsCheckoutMessage(invalidItems: ICartInvalidItem[]): string {
  if (invalidItems.length === 1) {
    return 'One cart item is no longer valid. Remove it before checking out.';
  }

  return 'Some cart items are no longer valid. Remove them before checking out.';
}

export function buildCheckoutRequest(
  items: ICartItem[],
  customer: CheckoutCustomerInput,
  options: { confirmedAddress?: boolean; includeCustomerNote?: boolean } = {},
): CheckoutValidationResult {
  const firstName = trimOptional(customer.firstName);
  const lastName = trimOptional(customer.lastName);
  const phone = trimOptional(customer.phone);
  const shippingLine2 = trimOptional(customer.shippingAddress.line2);
  const shippingPhone = trimOptional(customer.shippingAddress.phone);

  const payload: CheckoutRequestBody = {
    billingSameAsShipping: true,
    email: trimRequired(customer.email),
    items: items.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    })),
    shippingAddress: {
      city: trimRequired(customer.shippingAddress.city),
      countryCode: normalizeCountryCode(customer.shippingAddress.countryCode) as 'CA',
      fullName: trimRequired(customer.shippingAddress.fullName),
      line1: trimRequired(customer.shippingAddress.line1),
      line2: shippingLine2,
      phone: shippingPhone,
      postalCode: trimRequired(customer.shippingAddress.postalCode),
      province: normalizeProvinceCode(customer.shippingAddress.province) as CanadianProvinceCode,
    },
  };

  if (options.includeCustomerNote !== false) {
    payload.customerNote = trimOptional(customer.customerNote);
  }

  if (firstName) {
    payload.firstName = firstName;
  }

  if (lastName) {
    payload.lastName = lastName;
  }

  if (phone) {
    payload.phone = phone;
  }

  if (options.confirmedAddress === true) {
    payload.confirmedAddress = true;
  }

  const parsedPayload = checkoutRequestSchema.safeParse(payload);

  if (parsedPayload.success) {
    return {
      data: parsedPayload.data as CheckoutRequestBody,
      success: true,
    };
  }

  return {
    issues: parsedPayload.error.issues.map((issue) => issue.message),
    message: 'Your cart contains invalid checkout data. Remove the item and try again.',
    success: false,
  };
}

export function getValidatedCheckoutUrl(checkoutUrl: unknown): string {
  if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) {
    throw new Error(INVALID_CHECKOUT_URL_MESSAGE);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    throw new Error(INVALID_CHECKOUT_URL_MESSAGE);
  }

  if (
    parsedUrl.protocol !== 'https:'
    || parsedUrl.hostname !== STRIPE_CHECKOUT_HOSTNAME
  ) {
    throw new Error(INVALID_CHECKOUT_URL_MESSAGE);
  }

  return parsedUrl.toString();
}

export function redirectToCheckout(checkoutUrl: string): void {
  window.location.assign(getValidatedCheckoutUrl(checkoutUrl));
}
