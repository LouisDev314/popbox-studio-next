'use client';

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { type ICheckoutRequest, type ICheckoutSession } from '@/interfaces/checkout';

export function useStartCheckout() {
  const items = useCartStore((state) => state.items);
  const isCheckingOut = useCheckoutUiStore((state) => state.isCheckingOut);

  const { mutation: createCheckoutSession, isError } = useCustomizeMutation<
    ICheckoutSession,
    { data: ICheckoutRequest; key: string }
  >({
    mutationFn: ({ data, key }) => MutationConfigs.createCheckoutSession(data, key),
  });

  const startCheckout = useCallback(() => {
    if (!items.length) {
      return;
    }

    if (!useCheckoutUiStore.getState().beginCheckout()) {
      return;
    }

    const requestData: ICheckoutRequest = {
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    createCheckoutSession(
      { data: requestData, key: uuidv4() },
      {
        onSuccess: (response) => {
          const checkoutUrl = response.data.data?.checkoutUrl;

          if (!checkoutUrl) {
            useCheckoutUiStore.getState().endCheckout();
            return;
          }

          window.location.assign(checkoutUrl);
        },
        onError: () => {
          useCheckoutUiStore.getState().endCheckout();
        },
      },
    );
  }, [createCheckoutSession, items]);

  return {
    isCheckingOut,
    isError,
    startCheckout,
  };
}
