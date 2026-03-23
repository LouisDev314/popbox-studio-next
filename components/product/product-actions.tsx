'use client';

import { useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useCartStore } from '@/hooks/use-cart';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProduct } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import { getKujiSellableQuantity, isKujiProduct } from '@/utils/kuji';
import { mapProductToWishlistItem } from '@/utils/wishlist';

interface IProductActionsProps {
  product: IProduct;
}

const STANDARD_PRODUCT_MAX_QUANTITY = 20;
const KUJI_MAX_IN_CART_MESSAGE = 'You already have the maximum available quantity in your cart.';
const KUJI_SOLD_OUT_MESSAGE = 'This kuji is sold out.';

interface IKujiActionState {
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
  isKuji: boolean;
  isSoldOut: boolean;
  quantityCap: number;
}

function getKujiActionState(product: IProduct, currentCartQuantity: number): IKujiActionState {
  const sellableQuantity = getKujiSellableQuantity(product) ?? 0;
  const maxAddableQuantity = Math.max(0, sellableQuantity - currentCartQuantity);
  const isSoldOut = sellableQuantity <= 0;

  return {
    availabilityLabel: isSoldOut
      ? 'Sold out'
      : `${sellableQuantity} ticket${sellableQuantity === 1 ? '' : 's'} remaining`,
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
    return KUJI_SOLD_OUT_MESSAGE;
  }

  if (hasReachedCartLimit) {
    return KUJI_MAX_IN_CART_MESSAGE;
  }

  if (!isKuji) {
    return null;
  }

  return `Only ${maxAddableQuantity} ticket${maxAddableQuantity === 1 ? '' : 's'} remaining.`;
}

function getProductActionState(product: IProduct, currentCartQuantity: number): IProductActionState {
  const isKuji = isKujiProduct(product);

  if (!isKuji) {
    const isSoldOut = product.inventory?.available === 0;

    return {
      addButtonLabel: getAddButtonLabel(isSoldOut, false),
      availabilityLabel: isSoldOut ? 'Currently unavailable' : '',
      hasReachedCartLimit: false,
      increaseLimitMessage: null,
      isAddDisabled: isSoldOut,
      isKuji,
      isSoldOut,
      quantityCap: STANDARD_PRODUCT_MAX_QUANTITY,
    };
  }

  const kujiActionState = getKujiActionState(product, currentCartQuantity);
  const hasReachedCartLimit = kujiActionState.maxAddableQuantity <= 0 && !kujiActionState.isSoldOut;

  return {
    addButtonLabel: getAddButtonLabel(kujiActionState.isSoldOut, hasReachedCartLimit),
    availabilityLabel: kujiActionState.availabilityLabel,
    hasReachedCartLimit,
    increaseLimitMessage: getIncreaseLimitMessage(
      true,
      kujiActionState.isSoldOut,
      hasReachedCartLimit,
      kujiActionState.maxAddableQuantity,
    ),
    isAddDisabled: kujiActionState.isAddDisabled,
    isKuji,
    isSoldOut: kujiActionState.isSoldOut,
    quantityCap: kujiActionState.quantityCap,
  };
}

export function ProductActions(props: IProductActionsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const toggleWishlistItem = useWishlistStore((state) => state.toggleWishlistItem);
  const isWishlisted = useWishlistStore((state) => state.isProductWishlisted(props.product.id));
  const [quantity, setQuantity] = useState(1);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const currentCartQuantity = cartItems.find((item) => item.product.id === props.product.id)?.quantity ?? 0;
  const actionState = getProductActionState(props.product, currentCartQuantity);
  const quantityCap = actionState.quantityCap;
  const clampedQuantity = Math.min(quantity, quantityCap);

  const handleAdd = () => {
    const result = addItem(props.product, clampedQuantity);
    setFeedbackMessage(result.message);

    if (result.success) {
      setQuantity(1);
    }
  };

  const handleWishlistToggle = () => {
    toggleWishlistItem(mapProductToWishlistItem(props.product));
  };

  return (
    <div className="mt-8 space-y-4">
      <Button
        type="button"
        variant="outline"
        aria-pressed={hasWishlistHydrated && isWishlisted}
        className={cn(
          'h-12 w-full rounded-full border-border/70 bg-background/80 text-sm font-semibold shadow-sm',
          hasWishlistHydrated && isWishlisted
            ? 'border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15'
            : 'hover:bg-accent/70',
        )}
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

      <div className="rounded-4xl border border-border/60 bg-card/70 p-5 shadow-sm">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">Quantity</p>
            <p className="mt-1 text-sm text-muted-foreground">{actionState.availabilityLabel}</p>
          </div>
          <QuantityStepper
            disabled={actionState.isAddDisabled}
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
            {KUJI_MAX_IN_CART_MESSAGE}
          </p>
        ) : null}

        {!actionState.hasReachedCartLimit && feedbackMessage ? (
          <p className="mt-3 text-sm font-medium text-secondary-foreground">{feedbackMessage}</p>
        ) : null}

        <Button
          size="lg"
          className="mt-5 h-14 w-full rounded-full text-lg font-semibold"
          disabled={actionState.isAddDisabled}
          onClick={handleAdd}
        >
          <ShoppingBag className="mr-2 h-5 w-5" />
          {actionState.addButtonLabel}
        </Button>
      </div>
    </div>
  );
}
