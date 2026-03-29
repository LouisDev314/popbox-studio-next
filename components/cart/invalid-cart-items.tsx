'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type ICartInvalidItem } from '@/interfaces/cart';
import { cn } from '@/lib/utils';

interface IInvalidCartItemsProps {
  compact?: boolean;
  disabled?: boolean;
  items: ICartInvalidItem[];
  onRemove: (cartItemId: string) => void;
}

export function InvalidCartItems(props: IInvalidCartItemsProps) {
  if (props.items.length === 0) {
    return null;
  }

  return (
    <section
      className={cn(
        'rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-4',
        props.compact ? 'space-y-3' : 'space-y-4 p-5',
      )}
      aria-label="Cart issues"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Cart items need attention</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These saved items use outdated or incomplete product data and must be removed before checkout.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {props.items.map((item) => (
          <article
            key={item.id}
            className="rounded-[1.5rem] border border-destructive/20 bg-background/90 p-4 shadow-sm"
          >
            <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
                <StorefrontImage
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  label={item.product.name}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                      {item.product.name}
                    </p>
                    {item.product.collectionName ? (
                      <p className="mt-1 text-sm text-muted-foreground">{item.product.collectionName}</p>
                    ) : null}
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      Qty {item.quantity}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-full px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={props.disabled}
                    onClick={() => props.onRemove(item.id)}
                  >
                    Remove
                  </Button>
                </div>

                <p className="mt-3 text-sm font-medium text-destructive">{item.issueMessage}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
