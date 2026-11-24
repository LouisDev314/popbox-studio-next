'use client';

import { useCallback, useRef } from 'react';
import { AxiosError, HttpStatusCode } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import {
  type CheckoutSessionData,
  type CheckoutSessionRequest,
  type SuggestedShippingAddress,
} from '@/interfaces/checkout';
import {
  getApiErrorDetails,
  getApiErrorCode,
  getCheckoutAddressError,
  getProductVariantErrorCode,
  getProductVariantErrorMessage,
  isTimeoutAxiosError,
} from '@/utils/api-errors';
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  getInvalidCartItemsCheckoutMessage,
  getValidatedCheckoutUrl,
  redirectToCheckout,
} from '@/utils/checkout';
import { trackBeginCheckout } from '@/lib/analytics';
import { useCustomerAuth } from '@/components/auth/customer-auth-provider';

const CHECKOUT_ATTEMPT_STORAGE_KEY = 'popbox-checkout-attempt:v1';
const CHECKOUT_ATTEMPT_KEY_PATTERN = /^checkout-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type CheckoutAttempt = { fingerprint: string; key: Promise<string> };

function readSavedCheckoutAttempt(): { payloadHash: string; key: string } | null {
  try {
    const attempt: unknown = JSON.parse(window.sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) ?? 'null');

    if (
      typeof attempt === 'object'
      && attempt !== null
      && 'payloadHash' in attempt
      && typeof attempt.payloadHash === 'string'
      && /^[0-9a-f]{64}$/.test(attempt.payloadHash)
      && 'key' in attempt
      && typeof attempt.key === 'string'
      && CHECKOUT_ATTEMPT_KEY_PATTERN.test(attempt.key)
    ) {
      return { payloadHash: attempt.payloadHash, key: attempt.key };
    }
  } catch {
    // Storage can be blocked or contain an unreadable record.
  }

  return null;
}

function getCheckoutAttemptFingerprint(isAuthenticated: boolean, customerId: string | null, data: CheckoutSessionRequest): string {
  const { addressProof: _proof, checkoutDraftId: _draft, ...order } = data;
  return JSON.stringify([isAuthenticated, customerId, order]);
}

async function hashCheckoutAttempt(fingerprint: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getCheckoutAttemptKey(fingerprint: string): Promise<string> {
  const key = `checkout-${uuidv4()}`;
  try {
    // Browser storage only receives the hash and key. The payload includes contact details.
    const payloadHash = await hashCheckoutAttempt(fingerprint);
    const saved = readSavedCheckoutAttempt();
    if (saved?.payloadHash === payloadHash) {
      return saved.key;
    }

    window.sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify({ payloadHash, key }));
  } catch {
    // The hook still retains the key in memory if browser storage or hashing is unavailable.
  }

  return key;
}

function clearSavedCheckoutAttempt(key: string) {
  if (readSavedCheckoutAttempt()?.key !== key) {
    return;
  }

  try {
    window.sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // A retained key remains safe for the backend to reconcile.
  }
}

function getCheckoutRequestErrorMessage(
  error: AxiosError,
): string {
  if (isTimeoutAxiosError(error)) {
    return 'We couldn’t start checkout before the request timed out. Please try again.';
  }

  const details = getApiErrorDetails(
    error as AxiosError<IBaseApiResponse<unknown>>,
    'We couldn’t start checkout. Please review your cart and try again.',
  );
  const normalizedValidationMessages = details.validationMessages.map((message) => message.toLowerCase());

  if (
    normalizedValidationMessages.some((message) => (
      message.includes('productid')
      || message.includes('product id')
      || message.includes('invalid uuid')
    ))
  ) {
    return 'One or more items in your cart are no longer valid. Remove them before checking out.';
  }

  if (details.validationMessages.length > 0) {
    return 'Your cart failed checkout validation. Review the items in your cart and try again.';
  }

  return details.message;
}

function getCheckoutDialogConfig(error: AxiosError) {
  const status = error.response?.status;

  if (status === HttpStatusCode.Conflict || status === HttpStatusCode.NotFound) {
    return {
      message: 'Checkout is blocked because one or more items are no longer available. Refresh your cart and try again.',
      title: 'Checkout unavailable',
    };
  }

  if (status === HttpStatusCode.InternalServerError) {
    return {
      message: 'Something went wrong. Please try again.',
      title: 'Unable to start checkout',
    };
  }

  return null;
}

function getCheckoutStatusMessage(code: string | null): string | null {
  switch (code) {
    case 'CHECKOUT_CREATION_PENDING':
    case 'CHECKOUT_CREATION_UNCERTAIN':
    case 'CHECKOUT_CUSTOMER_BUSY':
    case 'CHECKOUT_RESUME_UNAVAILABLE':
      return 'Checkout is still being verified. Please retry from this page shortly.';
    case 'CHECKOUT_PAYMENT_PENDING':
      return 'Your payment is being confirmed. Check your email for confirmation or contact support before paying again.';
    case 'CHECKOUT_NOT_PAYABLE':
    case 'CHECKOUT_IDEMPOTENCY_CONFLICT':
    case 'CHECKOUT_SESSION_CONFLICT':
      return 'We couldn’t resume this checkout. Check for an order confirmation or contact support before starting a new checkout.';
    default:
      return null;
  }
}

export function useStartCheckout() {
  const auth = useCustomerAuth();
  const isAuthenticated = auth.status === 'customer';
  const customerId = isAuthenticated ? auth.user?.id ?? null : null;
  const invalidItems = useCartStore((state) => state.invalidItems);
  const checkoutErrorMessage = useCheckoutUiStore((state) => state.checkoutErrorMessage);
  const checkoutDialog = useCheckoutUiStore((state) => state.checkoutDialog);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);
  const attemptRef = useRef<CheckoutAttempt | null>(null);

  const { mutation: createCheckoutSession } = useCustomizeMutation<
    CheckoutSessionData,
    { data: CheckoutSessionRequest; key: Promise<string>; isAuthenticated: boolean }
  >({
    mutationFn: async ({ data, key, isAuthenticated }) => {
      const idempotencyKey = await key;
      return isAuthenticated
        ? MutationConfigs.createAuthenticatedCheckoutSession(data, idempotencyKey)
        : MutationConfigs.createCheckoutSession(data, idempotencyKey);
    },
  });

  const getResumableCheckout = useCallback(async (data: CheckoutSessionRequest): Promise<CheckoutSessionRequest | null> => {
    const saved = readSavedCheckoutAttempt();
    if (!saved || (isAuthenticated && !customerId)) return null;
    try {
      for (const candidate of [data, { ...data, confirmedAddress: true }]) {
        const fingerprint = getCheckoutAttemptFingerprint(isAuthenticated, customerId, candidate);
        if (saved.payloadHash === await hashCheckoutAttempt(fingerprint)) return candidate;
      }
    } catch {
      return null;
    }
    return null;
  }, [customerId, isAuthenticated]);

  const startCheckout = useCallback((
    data: CheckoutSessionRequest,
    options: {
      onAddressConfirmationRequired?: (
        suggestedAddress: SuggestedShippingAddress,
        request: CheckoutSessionRequest,
      ) => void;
      onSessionSuccess?: () => void;
      onAuthEmailMismatch?: () => void;
      onQuoteRequired?: (code: 'CHECKOUT_QUOTE_REQUIRED' | 'CHECKOUT_QUOTE_CHANGED') => void;
    } = {},
  ) => {
    if (invalidItems.length > 0) {
      useCheckoutUiStore.getState().setCheckoutError(
        getInvalidCartItemsCheckoutMessage(invalidItems),
      );
      return;
    }

    if (!useCheckoutUiStore.getState().beginCheckout()) {
      return;
    }

    const fingerprint = getCheckoutAttemptFingerprint(isAuthenticated, customerId, data);
    if (attemptRef.current?.fingerprint !== fingerprint) {
      attemptRef.current = {
        fingerprint,
        key: isAuthenticated && !customerId ? Promise.resolve(`checkout-${uuidv4()}`) : getCheckoutAttemptKey(fingerprint),
      };
    }

    const attempt = attemptRef.current;
    const clearAttempt = () => {
      if (attemptRef.current === attempt) {
        attemptRef.current = null;
      }
      void attempt.key.then(clearSavedCheckoutAttempt);
    };

    createCheckoutSession(
      { data, key: attempt.key, isAuthenticated },
      {
        onSuccess: (response) => {
          if (response.status !== HttpStatusCode.Created) {
            useCheckoutUiStore.getState().setCheckoutError(
              'We couldn’t start checkout right now. Please try again.',
            );
            return;
          }

          const checkoutUrl = response.data.data?.checkoutUrl;

          options.onSessionSuccess?.();

          try {
            getValidatedCheckoutUrl(checkoutUrl);
            trackBeginCheckout(useCartStore.getState().items);
            redirectToCheckout(checkoutUrl);
            clearAttempt();
            if (data.checkoutDraftId) {
              try { window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
            }
          } catch (error) {
            useCheckoutUiStore.getState().setCheckoutError(
              error instanceof Error
                ? error.message
                : 'We couldn’t start checkout right now. Please try again.',
            );
          }
        },
        onError: (error) => {
          const errorCode = getApiErrorCode(error);

          // Only a definitive rejection can safely start a new attempt with the same request.
          if (errorCode === 'CHECKOUT_CREATION_FAILED') {
            clearAttempt();
          }

          const checkoutStatusMessage = getCheckoutStatusMessage(errorCode);
          if (checkoutStatusMessage) {
            useCheckoutUiStore.getState().setCheckoutError(checkoutStatusMessage);
            return;
          }

          if (errorCode === 'CHECKOUT_QUOTE_REQUIRED' || errorCode === 'CHECKOUT_QUOTE_CHANGED') {
            useCheckoutUiStore.getState().endCheckout();
            options.onQuoteRequired?.(errorCode);
            return;
          }

          if (errorCode === 'AUTH_CHECKOUT_EMAIL_MISMATCH') {
            useCheckoutUiStore.getState().endCheckout();
            options.onAuthEmailMismatch?.();
            return;
          }

          const checkoutAddressError = getCheckoutAddressError(error as AxiosError<IBaseApiResponse<unknown>>);

          if (checkoutAddressError) {
            if (
              checkoutAddressError.code === 'ADDRESS_NEEDS_CONFIRMATION'
              && checkoutAddressError.suggestedAddress
            ) {
              useCheckoutUiStore.getState().endCheckout();
              options.onAddressConfirmationRequired?.(checkoutAddressError.suggestedAddress, data);
              return;
            }

            useCheckoutUiStore.getState().setCheckoutError(checkoutAddressError.message);
            return;
          }

          if (getProductVariantErrorCode(error)) {
            useCheckoutUiStore.getState().setCheckoutError(
              getProductVariantErrorMessage(
                error,
                'A selected variant is no longer available. Review your cart and try again.',
              ),
            );
            return;
          }

          const checkoutDialog = getCheckoutDialogConfig(error);

          if (checkoutDialog) {
            useCheckoutUiStore.getState().showCheckoutDialog(checkoutDialog);
            return;
          }

          useCheckoutUiStore.getState().setCheckoutError(
            getCheckoutRequestErrorMessage(error),
          );
        },
      },
    );
  }, [createCheckoutSession, customerId, invalidItems, isAuthenticated]);

  return {
    checkoutDialog,
    checkoutErrorMessage,
    getResumableCheckout,
    isCheckingOut,
    startCheckout,
  };
}
