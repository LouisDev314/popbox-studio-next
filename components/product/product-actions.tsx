'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useCartStore } from '@/hooks/use-cart';
import { useStorefrontAlert } from '@/hooks/use-storefront-alert';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProduct } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import { mapProductToWishlistItem } from '@/utils/wishlist';
import {
  getProductSellableQuantity,
  getProductInventoryStatusLabel,
  getProductSoldOutMessage,
  getRemainingQuantityMessage,
  getProductInventoryState,
  isKujiProduct,
  MAX_IN_CART_MESSAGE,
} from '@/utils/product-stock';

interface IProductActionsProps {
  product: IProduct;
}

type TStorefrontAction = 'cart' | 'wishlist';

interface IProductQuantityState {
  availabilityLabel: string;
  isAddDisabled: boolean;
  isSoldOut: boolean;
  maxAddableQuantity: number;
  quantityCap: number;
}

interface IProductActionState {
  addButtonLabel: string;
  availabilityLabel: string;
  hasReachedCartLimit: boolean;
  increaseLimitMessage: string | null;
  isAddDisabled: boolean;
  quantityCap: number;
}

function getProductQuantityState(product: IProduct, currentCartQuantity: number): IProductQuantityState {
  const isKuji = isKujiProduct(product);
  const inventoryState = getProductInventoryState(product);
  const sellableQuantity = getProductSellableQuantity(product);
  const maxAddableQuantity = Math.max(0, sellableQuantity - currentCartQuantity);
  const isSoldOut = sellableQuantity <= 0;
  const availabilityLabel = getProductInventoryStatusLabel(product);

  return {
    availabilityLabel: availabilityLabel ?? (
      isSoldOut
        ? isKuji ? 'Sold Out' : 'Currently unavailable'
        : inventoryState.isKuji
          ? getRemainingQuantityMessage(product, sellableQuantity)
          : 'Stock Available'
    ),
    isAddDisabled: isSoldOut || maxAddableQuantity <= 0,
    isSoldOut,
    maxAddableQuantity,
    quantityCap: Math.max(1, maxAddableQuantity),
  };
}

function getAddButtonLabel(isSoldOut: boolean, hasReachedCartLimit: boolean): string {
  if (isSoldOut) {
    return 'Sold Out';
  }

  if (hasReachedCartLimit) {
    return 'Max in Cart';
  }

  return 'Add to Cart';
}

function getIncreaseLimitMessage(
  isKuji: boolean,
  isSoldOut: boolean,
  hasReachedCartLimit: boolean,
  maxAddableQuantity: number,
): string | null {
  if (isSoldOut) {
    return getProductSoldOutMessage({ productType: isKuji ? 'kuji' : 'standard' });
  }

  if (hasReachedCartLimit) {
    return MAX_IN_CART_MESSAGE;
  }

  return getRemainingQuantityMessage({ productType: isKuji ? 'kuji' : 'standard' }, maxAddableQuantity);
}

function getProductActionState(product: IProduct, currentCartQuantity: number): IProductActionState {
  const isKuji = isKujiProduct(product);
  const quantityState = getProductQuantityState(product, currentCartQuantity);
  const hasReachedCartLimit = quantityState.maxAddableQuantity <= 0 && !quantityState.isSoldOut;

  return {
    addButtonLabel: getAddButtonLabel(quantityState.isSoldOut, hasReachedCartLimit),
    availabilityLabel: quantityState.availabilityLabel,
    hasReachedCartLimit,
    increaseLimitMessage: getIncreaseLimitMessage(
      isKuji,
      quantityState.isSoldOut,
      hasReachedCartLimit,
      quantityState.maxAddableQuantity,
    ),
    isAddDisabled: quantityState.isAddDisabled,
    quantityCap: quantityState.quantityCap,
  };
}

const ACTION_COOLDOWN_MS = 300;

export function ProductActions(props: IProductActionsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const toggleWishlistItem = useWishlistStore((state) => state.toggleWishlistItem);
  const isWishlisted = useWishlistStore((state) => state.isProductWishlisted(props.product.id));
  const [quantity, setQuantity] = useState(1);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<TStorefrontAction | null>(null);
  const [disabledActions, setDisabledActions] = useState<Record<TStorefrontAction, boolean>>({
    cart: false,
    wishlist: false,
  });
  const cooldownUntilRef = useRef<Record<TStorefrontAction, number>>({
    cart: 0,
    wishlist: 0,
  });
  const releaseTimeoutRef = useRef<Record<TStorefrontAction, number | null>>({
    cart: null,
    wishlist: null,
  });
  const { showSuccess } = useStorefrontAlert();

  const currentCartQuantity = cartItems.find((item) => item.product.id === props.product.id)?.quantity ?? 0;
  const actionState = getProductActionState(props.product, currentCartQuantity);
  const quantityCap = actionState.quantityCap;
  const clampedQuantity = Math.min(quantity, quantityCap);
  const isCartBusy = disabledActions.cart;
  const isWishlistBusy = disabledActions.wishlist;

  useEffect(() => {
    const releaseTimeouts = releaseTimeoutRef.current;

    return () => {
      if (releaseTimeouts.cart !== null) {
        window.clearTimeout(releaseTimeouts.cart);
      }

      if (releaseTimeouts.wishlist !== null) {
        window.clearTimeout(releaseTimeouts.wishlist);
      }
    };
  }, []);

  const scheduleActionRelease = (action: TStorefrontAction) => {
    const existingTimeoutId = releaseTimeoutRef.current[action];

    if (existingTimeoutId !== null) {
      window.clearTimeout(existingTimeoutId);
    }

    releaseTimeoutRef.current[action] = window.setTimeout(() => {
      setDisabledActions((currentDisabledActions) => ({
        ...currentDisabledActions,
        [action]: false,
      }));

      setBusyAction((currentBusyAction) => (currentBusyAction === action ? null : currentBusyAction));
      releaseTimeoutRef.current[action] = null;
    }, ACTION_COOLDOWN_MS);
  };

  const runGuardedAction = (action: TStorefrontAction, fn: () => void) => {
    if (busyAction === action || disabledActions[action]) {
      return;
    }

    const now = Date.now();

    if (cooldownUntilRef.current[action] > now) {
      return;
    }

    cooldownUntilRef.current[action] = now + ACTION_COOLDOWN_MS;
    setBusyAction(action);
    setDisabledActions((currentDisabledActions) => ({
      ...currentDisabledActions,
      [action]: true,
    }));

    try {
      fn();
    } finally {
      scheduleActionRelease(action);
    }
  };

  const handleAdd = () => {
    runGuardedAction('cart', () => {
      const result = addItem(props.product, clampedQuantity);

      if (!result.success) {
        setFeedbackMessage(result.message);
        return;
      }

      setFeedbackMessage(null);
      setQuantity(1);
      showSuccess('Added to cart');
    });
  };

  const handleWishlistToggle = () => {
    runGuardedAction('wishlist', () => {
      const shouldShowSuccess = !isWishlisted;

      toggleWishlistItem(mapProductToWishlistItem(props.product));

      showSuccess(
        shouldShowSuccess ? 'Added to wishlist' : 'Removed from wishlist',
        undefined,
        shouldShowSuccess ? 'success' : 'warning',
      );
    });
  };

  return (
    <div className="mt-8 space-y-4">
      <Button
        type="button"
        variant="outline"
        aria-pressed={hasWishlistHydrated && isWishlisted}
        className={cn(
          'h-12 w-full rounded-full border-border/70 bg-background text-sm font-semibold',
          hasWishlistHydrated && isWishlisted
            ? 'border-primary/30 bg-accent text-foreground hover:bg-accent'
            : 'hover:bg-accent/70',
        )}
        disabled={isWishlistBusy}
        onClick={handleWishlistToggle}
      >
        <Heart
          className={cn(
            'mr-2 h-5 w-5',
            hasWishlistHydrated && isWishlisted ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        {hasWishlistHydrated && isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
      </Button>

      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">Quantity</p>
          </div>
          <QuantityStepper
            disabled={actionState.isAddDisabled || isCartBusy}
            value={clampedQuantity}
            decreaseDisabled={clampedQuantity <= 1}
            increaseDisabled={clampedQuantity >= quantityCap}
            onDecrease={() => {
              setFeedbackMessage(null);
              setQuantity(Math.max(1, clampedQuantity - 1));
            }}
            onIncrease={() => {
              if (clampedQuantity >= quantityCap) {
                setFeedbackMessage(actionState.increaseLimitMessage);
                return;
              }

              setFeedbackMessage(null);
              setQuantity(Math.min(quantityCap, clampedQuantity + 1));
            }}
          />
        </div>

        {actionState.hasReachedCartLimit ? (
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {MAX_IN_CART_MESSAGE}
          </p>
        ) : null}

        {!actionState.hasReachedCartLimit && feedbackMessage ? (
          <p className="mt-3 text-sm font-medium text-foreground">{feedbackMessage}</p>
        ) : null}

        <Button
          size="lg"
          className="mt-5 h-14 w-full rounded-xl text-lg font-semibold"
          disabled={actionState.isAddDisabled || isCartBusy}
          onClick={handleAdd}
        >
          <ShoppingBag className="mr-2 h-5 w-5" />
          {actionState.addButtonLabel}
        </Button>
      </div>
    </div>
  );
}
