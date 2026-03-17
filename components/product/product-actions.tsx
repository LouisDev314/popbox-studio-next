'use client';

import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useCartStore } from '@/hooks/use-cart';
import { type IProduct } from '@/interfaces/product';
import { formatPrice } from '@/utils/helpers';

interface IProductActionsProps {
  product: IProduct;
}

export function ProductActions(props: IProductActionsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);

  const isOutOfStock = props.product.inventory?.available === 0;
  const availableInventory = props.product.inventory?.available;
  const availabilityLabel = isOutOfStock
    ? 'Currently unavailable'
    : typeof availableInventory === 'number'
      ? `${availableInventory} available`
      : 'Available to order';

  const handleAdd = () => {
    addItem(props.product, quantity);
    // Could add toast here
  };

  return (
    <div className="mt-8 rounded-4xl border border-border/60 bg-card/70 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Quantity</p>
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
  );
}
