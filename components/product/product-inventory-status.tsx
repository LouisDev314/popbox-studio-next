import { type IKujiPrize, type IProductCard } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import {
  getProductInventoryState,
  getProductInventoryStatusLabel,
} from '@/utils/product-stock';
import { CheckCircle2, CircleX } from 'lucide-react';

type ProductInventoryStatusVariant = 'card' | 'detail';

interface IProductInventoryStatusProps {
  product: Pick<IProductCard, 'inventory' | 'productType' | 'ticketSummary'> & {
    kujiPrizes?: IKujiPrize[];
  };
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
  const isDetail = variant === 'detail';

  if (isDetail) {
    return (
      <div
        className={cn(
          'mt-5 w-fit rounded-2xl px-4 py-2 bg-primary/12 text-primary',
          props.className,
        )}
      >
        <span
          className={cn(
            'text-base font-semibold leading-none',
            getDetailTextClasses(inventoryState.status),
          )}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mt-2 inline-flex w-fit items-center gap-1.5',
        getCardTextClasses(inventoryState.status),
        props.className,
      )}
    >
      {isSoldOut ? (
        <CircleX className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}

      <span className="text-xs font-medium leading-none sm:text-sm">{label}</span>
    </div>
  );
}

function getCardTextClasses(
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

function getDetailTextClasses(
  status: ReturnType<typeof getProductInventoryState>['status'],
): string {
  if (status === 'sold_out') {
    return 'text-destructive';
  }

  if (status === 'low_stock') {
    return 'text-amber-500';
  }

  return 'text-primary';
}

function getStatusIconClasses(
  status: ReturnType<typeof getProductInventoryState>['status'],
): string {
  if (status === 'low_stock') {
    return 'text-primary';
  }

  return 'text-emerald-600';
}
