'use client';

import Link from 'next/link';
import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Share, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useCartStore } from '@/hooks/use-cart';
import { useStorefrontAlert } from '@/hooks/use-storefront-alert';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProduct } from '@/interfaces/product';
import { shareProduct } from '@/lib/share-product';
import { flyProductImageToTarget } from '@/lib/ui/fly-to-target';
import { cn } from '@/lib/utils';
import { getProductCoverImage } from '@/utils/product-images';
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

type TStorefrontAction = 'cart' | 'share' | 'wishlist';

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
const ACTION_SUCCESS_FEEDBACK_FALLBACK_MS = 1200;
const SECONDARY_ACTION_BUTTON_CLASS_NAME = 'h-12 w-full rounded-2xl border-border/70 bg-background text-sm font-semibold text-foreground hover:bg-accent/70';

function WishlistActionButton(props: {
  feedback: 'added' | 'removed' | null;
  hasWishlistHydrated: boolean;
  isBusy: boolean;
  isWishlisted: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const isSuccessVisible = props.feedback !== null && props.isBusy;
  const normalLabel = props.hasWishlistHydrated && props.isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
  const label = isSuccessVisible
    ? props.feedback === 'removed' ? 'Removed' : 'Added'
    : normalLabel;

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={label}
      aria-pressed={props.hasWishlistHydrated && props.isWishlisted}
      className={cn(
        SECONDARY_ACTION_BUTTON_CLASS_NAME,
        props.hasWishlistHydrated && props.isWishlisted
          ? 'border-primary/30 bg-accent hover:bg-accent'
          : undefined,
      )}
      disabled={props.isBusy}
      onClick={props.onClick}
      data-testid="wishlist-toggle"
    >
      {isSuccessVisible ? (
        <span aria-live="polite">{label}</span>
      ) : (
        <>
          <Heart
            className={cn(
              'mr-2 h-5 w-5',
              props.hasWishlistHydrated && props.isWishlisted ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span aria-live="polite">{label}</span>
        </>
      )}
    </Button>
  );
}

function AddToCartButton(props: {
  addButtonLabel: string;
  disabled: boolean;
  isSuccessVisible: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const label = props.isSuccessVisible ? 'Added' : props.addButtonLabel;

  return (
    <Button
      size="lg"
      aria-label={label}
      className="mt-5 h-14 w-full rounded-xl text-lg font-semibold"
      disabled={props.disabled}
      onClick={props.onClick}
      data-testid="add-to-cart"
    >
      {props.isSuccessVisible ? (
        <span aria-live="polite">{label}</span>
      ) : (
        <>
          <ShoppingBag className="mr-2 h-5 w-5" />
          <span aria-live="polite">
            {props.addButtonLabel}
          </span>
        </>
      )}
    </Button>
  );
}

export function ProductActions(props: IProductActionsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const toggleWishlistItem = useWishlistStore((state) => state.toggleWishlistItem);
  const isWishlisted = useWishlistStore((state) => state.isProductWishlisted(props.product.id));
  const [quantity, setQuantity] = useState(1);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [cartFeedback, setCartFeedback] = useState<'added' | null>(null);
  const [wishlistFeedback, setWishlistFeedback] = useState<'added' | 'removed' | null>(null);
  const [busyAction, setBusyAction] = useState<TStorefrontAction | null>(null);
  const [disabledActions, setDisabledActions] = useState<Record<TStorefrontAction, boolean>>({
    cart: false,
    share: false,
    wishlist: false,
  });
  const cooldownUntilRef = useRef<Record<TStorefrontAction, number>>({
    cart: 0,
    share: 0,
    wishlist: 0,
  });
  const releaseTimeoutRef = useRef<Record<TStorefrontAction, number | null>>({
    cart: null,
    share: null,
    wishlist: null,
  });
  const { showSuccess } = useStorefrontAlert();

  const flyImage = getProductCoverImage(props.product) ?? props.product.images[0] ?? null;
  const currentCartQuantity = cartItems.find((item) => item.product.id === props.product.id)?.quantity ?? 0;
  const actionState = getProductActionState(props.product, currentCartQuantity);
  const quantityCap = actionState.quantityCap;
  const clampedQuantity = Math.min(quantity, quantityCap);
  const isCartBusy = disabledActions.cart;
  const isShareBusy = disabledActions.share;
  const isWishlistBusy = disabledActions.wishlist;
  const isKuji = isKujiProduct(props.product);
  const isCartSuccessVisible = cartFeedback !== null && isCartBusy;
  const fireProductFlyAnimation = (target: 'cart' | 'wishlist', sourceElement: Element) => {
    try {
      flyProductImageToTarget({
        imageAlt: flyImage?.altText ?? props.product.name,
        imageUrl: flyImage?.url,
        sourceElement,
        target,
      });
    } catch {
      // Decorative feedback must never affect product actions.
    }
  };

  useEffect(() => {
    const releaseTimeouts = releaseTimeoutRef.current;

    return () => {
      if (releaseTimeouts.cart !== null) {
        window.clearTimeout(releaseTimeouts.cart);
      }

      if (releaseTimeouts.share !== null) {
        window.clearTimeout(releaseTimeouts.share);
      }

      if (releaseTimeouts.wishlist !== null) {
        window.clearTimeout(releaseTimeouts.wishlist);
      }
    };
  }, []);

  const completeGuardedAction = useCallback((action: TStorefrontAction) => {
    const existingTimeoutId = releaseTimeoutRef.current[action];

    if (existingTimeoutId !== null) {
      window.clearTimeout(existingTimeoutId);
      releaseTimeoutRef.current[action] = null;
    }

    cooldownUntilRef.current[action] = 0;

    setDisabledActions((currentDisabledActions) => ({
      ...currentDisabledActions,
      [action]: false,
    }));

    setBusyAction((currentBusyAction) => (currentBusyAction === action ? null : currentBusyAction));
    if (action === 'cart') {
      setCartFeedback(null);
    }

    if (action === 'wishlist') {
      setWishlistFeedback(null);
    }
  }, []);

  const scheduleActionRelease = (action: TStorefrontAction, timeoutMs: number) => {
    const existingTimeoutId = releaseTimeoutRef.current[action];

    if (existingTimeoutId !== null) {
      window.clearTimeout(existingTimeoutId);
    }

    releaseTimeoutRef.current[action] = window.setTimeout(() => {
      completeGuardedAction(action);
    }, timeoutMs);
  };

  const activateGuardedAction = (action: TStorefrontAction) => {
    if (busyAction === action || disabledActions[action]) {
      return false;
    }

    const now = Date.now();

    if (cooldownUntilRef.current[action] > now) {
      return false;
    }

    cooldownUntilRef.current[action] = now + ACTION_COOLDOWN_MS;
    setBusyAction(action);
    setDisabledActions((currentDisabledActions) => ({
      ...currentDisabledActions,
      [action]: true,
    }));

    return true;
  };

  const runGuardedAction = (action: TStorefrontAction, fn: () => boolean) => {
    if (!activateGuardedAction(action)) {
      return;
    }

    let didShowFeedback = false;

    try {
      didShowFeedback = fn();
    } finally {
      scheduleActionRelease(action, didShowFeedback ? ACTION_SUCCESS_FEEDBACK_FALLBACK_MS : ACTION_COOLDOWN_MS);
    }
  };

  const runGuardedAsyncAction = async (action: TStorefrontAction, fn: () => Promise<void>) => {
    if (!activateGuardedAction(action)) {
      return;
    }

    try {
      await fn();
    } finally {
      scheduleActionRelease(action, ACTION_COOLDOWN_MS);
    }
  };

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    const sourceElement = event.currentTarget;

    void runGuardedAction('cart', () => {
      const result = addItem(props.product, clampedQuantity);

      if (!result.success) {
        setCartFeedback(null);
        setFeedbackMessage(result.message);
        return false;
      }

      setFeedbackMessage(null);
      setCartFeedback('added');
      setQuantity(1);
      fireProductFlyAnimation('cart', sourceElement);
      return true;
    });
  };

  const handleShare = () => {
    void runGuardedAsyncAction('share', async () => {
      const result = await shareProduct({
        title: props.product.name,
        description: props.product.description,
        url: window.location.href,
      });

      if (result.status === 'copied') {
        showSuccess('Product link copied');
        return;
      }

      if (result.status === 'failed') {
        showSuccess('Product not shared', 'Please copy the URL from your browser.', 'warning');
      }
    });
  };

  const handleWishlistToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const sourceElement = event.currentTarget;

    void runGuardedAction('wishlist', () => {
      const nextFeedback = isWishlisted ? 'removed' : 'added';

      toggleWishlistItem(mapProductToWishlistItem(props.product));
      setWishlistFeedback(nextFeedback);

      if (!isWishlisted) {
        fireProductFlyAnimation('wishlist', sourceElement);
      }

      return true;
    });
  };

  return (
    <div className="mt-8 space-y-4" data-testid="product-actions">
      <div className="flex gap-3">
        <WishlistActionButton
          feedback={wishlistFeedback}
          hasWishlistHydrated={hasWishlistHydrated}
          isBusy={isWishlistBusy}
          isWishlisted={isWishlisted}
          onClick={handleWishlistToggle}
        />

        <Button
          type="button"
          variant="outline"
          aria-label="Share product"
          className={cn(SECONDARY_ACTION_BUTTON_CLASS_NAME, 'w-fit')}
          disabled={isShareBusy}
          onClick={handleShare}
        >
          <Share className="size-5" />
        </Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium text-lg">Quantity</p>
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
            {MAX_IN_CART_MESSAGE}
          </p>
        ) : null}

        {!actionState.hasReachedCartLimit && feedbackMessage ? (
          <p className="mt-3 text-sm font-medium text-foreground">{feedbackMessage}</p>
        ) : null}

        <AddToCartButton
          addButtonLabel={actionState.addButtonLabel}
          disabled={actionState.isAddDisabled || isCartBusy}
          isSuccessVisible={isCartSuccessVisible}
          onClick={handleAdd}
        />
      </div>

      <p className="text-sm leading-6 text-muted-foreground">
        {isKuji ? 'Random draw item. All sales final. ' : null}
        <Link href="/legal/shipping-returns" className="underline underline-offset-4 transition-colors hover:text-foreground">
          Shipping &amp; Returns
        </Link>
        {isKuji ? (
          <>
            {' and '}
            <Link href="/faq" className="underline underline-offset-4 transition-colors hover:text-foreground">
              FAQ
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
