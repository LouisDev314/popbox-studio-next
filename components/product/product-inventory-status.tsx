import { type IProductCard } from '@/interfaces/product';
import { cn } from '@/lib/utils';
import { getProductInventoryState, getProductInventoryStatusLabel } from '@/utils/product-stock';

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

  if (variant === 'detail') {
    return (
      <div
        className={cn(
          'mt-6 inline-flex w-fit flex-col rounded-[1.5rem] border px-4 py-3 shadow-sm',
          getDetailContainerClasses(inventoryState.status, inventoryState.isKuji),
          props.className,
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
          {inventoryState.isKuji ? 'Ticket stock' : 'Availability'}
        </span>
        <span className="mt-1 text-sm font-semibold sm:text-base">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'z-20 flex items-center gap-2 text-sm font-medium',
        getCardTextClasses(inventoryState.status, inventoryState.isKuji),
        props.className,
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          getCardDotClasses(inventoryState.status, inventoryState.isKuji),
        )}
      />
      <span>{label}</span>
    </div>
  );
}

function getCardTextClasses(status: ReturnType<typeof getProductInventoryState>['status'], isKuji: boolean): string {
  if (status === 'sold_out') {
    return 'text-rose-700';
  }

  if (status === 'low_stock') {
    return 'text-orange-700';
  }

  return isKuji ? 'text-muted-foreground' : 'text-emerald-700';
}

function getCardDotClasses(status: ReturnType<typeof getProductInventoryState>['status'], isKuji: boolean): string {
  if (status === 'sold_out') {
    return 'bg-rose-600';
  }

  if (status === 'low_stock') {
    return 'bg-orange-500';
  }

  return isKuji ? 'bg-muted-foreground/70' : 'bg-emerald-600';
}

function getDetailContainerClasses(
  status: ReturnType<typeof getProductInventoryState>['status'],
  isKuji: boolean,
): string {
  if (status === 'sold_out') {
    return 'border-rose-200/80 bg-rose-50/90 text-rose-800';
  }

  if (status === 'low_stock') {
    return 'border-orange-200/80 bg-orange-50/90 text-orange-800';
  }

  return isKuji
    ? 'border-border/70 bg-card/80 text-foreground'
    : 'border-emerald-200/70 bg-emerald-50/80 text-emerald-800';
}
