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
          'mt-5 w-fit rounded-2xl border border-border/60 bg-muted/30 p-4',
          props.className,
        )}
      >
        <div className="flex items-center gap-2">
          {isSoldOut ? (
            <CircleX className="h-5 w-5 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2
              className={cn(
                'h-5 w-5 shrink-0',
                getStatusIconClasses(inventoryState.status),
              )}
            />
          )}

          <span
            className={cn(
              'text-base font-semibold leading-none',
              getDetailTextClasses(inventoryState.status),
            )}
          >
            {label}
          </span>
        </div>
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
    return 'text-primary';
  }

  return 'text-foreground';
}

function getStatusIconClasses(
  status: ReturnType<typeof getProductInventoryState>['status'],
): string {
  if (status === 'low_stock') {
    return 'text-primary';
  }

  return 'text-emerald-600';
}
