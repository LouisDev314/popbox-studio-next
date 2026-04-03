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
          'mt-6 inline-flex min-w-[11rem] w-fit flex-col gap-0.5 rounded-[1.5rem] border px-4 py-3.5 shadow-sm',
          getDetailContainerClasses(inventoryState.status, inventoryState.isKuji),
          props.className,
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-75">
          {inventoryState.isKuji ? 'Ticket stock' : 'Availability'}
        </span>
        <span className="text-sm font-semibold leading-5 sm:text-base">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'z-20 inline-flex w-fit items-center gap-2 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-border/50 backdrop-blur-[2px] sm:text-xs',
        getCardTextClasses(inventoryState.status, inventoryState.isKuji),
        props.className,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          getCardDotClasses(inventoryState.status, inventoryState.isKuji),
        )}
      />
      <span>{label}</span>
    </div>
  );
}

function getCardTextClasses(status: ReturnType<typeof getProductInventoryState>['status'], isKuji: boolean): string {
  if (status === 'sold_out') {
    return 'text-foreground';
  }

  if (status === 'low_stock') {
    return 'text-primary';
  }

  return isKuji ? 'text-muted-foreground' : 'text-emerald-700';
}

function getCardDotClasses(status: ReturnType<typeof getProductInventoryState>['status'], isKuji: boolean): string {
  if (status === 'sold_out') {
    return 'bg-foreground';
  }

  if (status === 'low_stock') {
    return 'bg-primary';
  }

  return isKuji ? 'bg-muted-foreground/70' : 'bg-emerald-600';
}

function getDetailContainerClasses(
  status: ReturnType<typeof getProductInventoryState>['status'],
  isKuji: boolean,
): string {
  if (status === 'sold_out') {
    return 'border-border/70 bg-muted/70 text-foreground';
  }

  if (status === 'low_stock') {
    return 'border-primary/25 bg-accent/50 text-foreground';
  }

  return isKuji
    ? 'border-border/70 bg-card/80 text-foreground'
    : 'border-emerald-200/70 bg-emerald-50/80 text-emerald-800';
}
