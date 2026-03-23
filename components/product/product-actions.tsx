'use client';

import { useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useCartStore } from '@/hooks/use-cart';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { type IProduct } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import { mapProductToWishlistItem } from '@/utils/wishlist';

interface IProductActionsProps {
  product: IProduct;
}

export function ProductActions(props: IProductActionsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const hasWishlistHydrated = useWishlistStore((state) => state.hasHydrated);
  const toggleWishlistItem = useWishlistStore((state) => state.toggleWishlistItem);
  const isWishlisted = useWishlistStore((state) => state.isProductWishlisted(props.product.id));
  const [quantity, setQuantity] = useState(1);

  const isOutOfStock = props.product.inventory?.available === 0;
  // const availableInventory = props.product.inventory?.available;
  // const availabilityLabel = isOutOfStock
  //   ? 'Currently unavailable'
  //   : typeof availableInventory === 'number'
  //     ? `${availableInventory} available`
  //     : 'Available to order';
  const availabilityLabel = isOutOfStock ? 'Currently unavailable' : '';

  const handleAdd = () => {
    addItem(props.product, quantity);
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
            <p className="mt-1 text-sm text-muted-foreground">{availabilityLabel}</p>
          </div>
          <QuantityStepper
            disabled={isOutOfStock}
            value={quantity}
            onDecrease={() => setQuantity(Math.max(1, quantity - 1))}
            onIncrease={() => setQuantity(Math.min(20, quantity + 1))}
          />
        </div>

        <Button
          size="lg"
          className="mt-5 h-14 w-full rounded-full text-lg font-semibold"
          disabled={isOutOfStock}
          onClick={handleAdd}
        >
          <ShoppingBag className="mr-2 h-5 w-5" />
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
}
