'use client';

import { useCallback } from 'react';
import { AxiosError, HttpStatusCode } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import { type ICheckoutRequest, type ICheckoutSession } from '@/interfaces/checkout';
import { getApiErrorDetails, isTimeoutAxiosError } from '@/utils/api-errors';
import {
  buildCheckoutRequest,
  getInvalidCartItemsCheckoutMessage,
  redirectToCheckout,
} from '@/utils/checkout';

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

  if (status === HttpStatusCode.Conflict) {
    return {
      message: 'This order can no longer be checked out because one or more items are no longer available.',
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
  const items = useCartStore((state) => state.items);
  const checkoutErrorMessage = useCheckoutUiStore((state) => state.checkoutErrorMessage);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);

  const { mutation: createCheckoutSession } = useCustomizeMutation<
    ICheckoutSession,
    { data: ICheckoutRequest; key: string }
  >({
    mutationFn: ({ data, key }) => MutationConfigs.createCheckoutSession(data, key),
  });

  const startCheckout = useCallback(() => {
    if (invalidItems.length > 0) {
      useCheckoutUiStore.getState().setCheckoutError(
        getInvalidCartItemsCheckoutMessage(invalidItems),
      );
      return;
    }

    if (!items.length) {
      return;
    }

    if (!useCheckoutUiStore.getState().beginCheckout()) {
      return;
    }

    const requestData = buildCheckoutRequest(items);

    if (!requestData.success) {
      useCheckoutUiStore.getState().setCheckoutError(requestData.message);
      return;
    }

    createCheckoutSession(
      { data: requestData.data, key: uuidv4() },
      {
        onSuccess: (response) => {
          const checkoutUrl = response.data.data?.checkoutUrl;

          if (!checkoutUrl) {
            useCheckoutUiStore.getState().setCheckoutError(
              'We couldn’t start checkout right now. Please try again.',
            );
            return;
          }

          try {
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
  }, [createCheckoutSession, invalidItems, items]);

  return {
    checkoutErrorMessage,
    isCheckingOut,
    startCheckout,
  };
}
