import { type IProductCard } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import { getProductInventoryState, getProductInventoryStatusLabel } from '@/utils/product-stock';
import { CheckCircle2, CircleX } from 'lucide-react';

type ProductInventoryStatusVariant = 'card' | 'detail';

interface IProductInventoryStatusProps {
  product: Pick<IProductCard, 'inventory' | 'productType'>;
  variant?: ProductInventoryStatusVariant;
  className?: string;
}

export function ProductInventoryStatus(props: IProductInventoryStatusProps) {
  const variant = props.variant ?? 'card';
  const inventoryState = getProductInventoryState(props.product);
  const label = getProductInventoryStatusLabel(props.product);

  if (!inventoryState.hasInventoryData || !label) {
    return null;
  }

  const isSoldOut = inventoryState.status === 'sold_out';

  return (
    <div
      className={cn(
        'mt-6 inline-flex w-fit items-center gap-1.5',
        getDetailInlineTextClasses(inventoryState.status),
        props.className,
      )}
    >
      {isSoldOut ? (
        <CircleX className={cn('h-5 w-5 shrink-0', variant)} />
      ) : (
        <CheckCircle2 className={cn('h-5 w-5 shrink-0')} />
      )}

      <span className={cn('text-sm font-semibold leading-none sm:text-base')}>{label}</span>
    </div>
  );
}

function getDetailInlineTextClasses(
  status: ReturnType<typeof getProductInventoryState>['status'],
): string {
  if (status === 'sold_out') {
    return 'text-destructive';
  }

  if (status === 'low_stock') {
    return 'text-primary';
  }

  return 'text-emerald-600';
}
