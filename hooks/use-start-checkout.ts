'use client';

import { useCallback } from 'react';
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
  getCheckoutAddressError,
  isTimeoutAxiosError,
} from '@/utils/api-errors';
import {
  getInvalidCartItemsCheckoutMessage,
  getValidatedCheckoutUrl,
  redirectToCheckout,
} from '@/utils/checkout';
import { trackBeginCheckout } from '@/lib/analytics';

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

export function useStartCheckout() {
  const invalidItems = useCartStore((state) => state.invalidItems);
  const checkoutErrorMessage = useCheckoutUiStore((state) => state.checkoutErrorMessage);
  const checkoutDialog = useCheckoutUiStore((state) => state.checkoutDialog);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);

  const { mutation: createCheckoutSession } = useCustomizeMutation<
    CheckoutSessionData,
    { data: CheckoutSessionRequest; key: string }
  >({
    mutationFn: ({ data, key }) => MutationConfigs.createCheckoutSession(data, key),
  });

  const startCheckout = useCallback((
    data: CheckoutSessionRequest,
    options: {
      onAddressConfirmationRequired?: (
        suggestedAddress: SuggestedShippingAddress,
        request: CheckoutSessionRequest,
      ) => void;
      onSessionSuccess?: () => void;
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

    createCheckoutSession(
      { data, key: `checkout-${uuidv4()}` },
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
          } catch (error) {
            useCheckoutUiStore.getState().setCheckoutError(
              error instanceof Error
                ? error.message
                : 'We couldn’t start checkout right now. Please try again.',
            );
          }
        },
        onError: (error) => {
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
  }, [createCheckoutSession, invalidItems]);

  return {
    checkoutDialog,
    checkoutErrorMessage,
    isCheckingOut,
    startCheckout,
  };
}
