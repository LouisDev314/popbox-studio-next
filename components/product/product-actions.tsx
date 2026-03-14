'use client';

import { useState } from 'react';
import { IProduct } from '@/interfaces/product';
import { useCartStore } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { formatPrice } from '@/utils/helpers';

interface IProductActionsProps {
  product: IProduct;
}

export function ProductActions(props: IProductActionsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);

  const isOutOfStock = props.product.inventory?.available === 0;

  const handleAdd = () => {
    addItem(props.product, quantity);
    // Could add toast here
  };

  return (
    <div className="flex flex-col gap-4 mt-8">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground mr-2">Quantity</span>
        <div className="flex items-center rounded-full border border-border">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-l-full h-10 w-10 hover:bg-muted"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={isOutOfStock}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm font-medium">{quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-r-full h-10 w-10 hover:bg-muted"
            onClick={() => setQuantity(Math.min(20, quantity + 1))}
            disabled={isOutOfStock}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button 
        size="lg" 
        className="w-full rounded-full h-14 text-lg font-semibold mt-2"
        disabled={isOutOfStock}
        onClick={handleAdd}
      >
        <ShoppingBag className="mr-2 h-5 w-5" />
        {isOutOfStock ? 'Out of Stock' : `Add to Cart - ${formatPrice(props.product.priceCents * quantity, props.product.currency)}`}
      </Button>
    </div>
  );
}
