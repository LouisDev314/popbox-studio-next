'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StorefrontDrawerEmptyState } from '@/components/ui/storefront-drawer-empty-state';
import { StorefrontDrawer } from '@/components/ui/storefront-drawer';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { formatPrice } from '@/lib/utils';

interface IWishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerButtonId?: string;
}

function WishlistDrawerItemSkeleton() {
  return (
    <article className="rounded-[1.75rem] border border-border/70 bg-card p-4 pb-2">
      <div className="flex gap-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-4/5 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <div className="mt-3 flex justify-end">
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function WishlistDrawer(props: IWishlistDrawerProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const triggerButtonId = props.triggerButtonId;
  const items = useWishlistStore((state) => state.items);
  const hasHydrated = useWishlistStore((state) => state.hasHydrated);
  const removeWishlistItem = useWishlistStore((state) => state.removeWishlistItem);

  const handleRemoveWishlistItem = (productId: string) => {
    removeWishlistItem(productId);
  };

  return (
    <StorefrontDrawer
      isOpen={isOpen}
      onClose={onClose}
      triggerButtonId={triggerButtonId}
      contentClassName="overflow-hidden"
      bodyClassName="p-0"
      title={
        <>
          <Heart className="h-5 w-5" />
          Wishlist {hasHydrated && items.length > 0 ? `(${items.length})` : null}
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto py-5 px-4">
          {!hasHydrated ? (
            <div className="space-y-4" aria-hidden="true">
              <Skeleton className="h-6 w-32 rounded-full" />
              <WishlistDrawerItemSkeleton />
              <WishlistDrawerItemSkeleton />
            </div>
          ) : items.length === 0 ? (
            <StorefrontDrawerEmptyState
              icon={<Heart className="h-7 w-7 text-muted-foreground" />}
              title="Your wishlist is empty"
              description="Save a few favorites here so you can come back when you are ready to buy."
              action={(
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-5"
                  onClick={onClose}
                >
                  Continue Shopping
                </Button>
              )}
            />
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-[1.75rem] border border-border/70 bg-card p-4 pb-2">
                  <div className="flex gap-4">
                    <Link
                      href={`/products/${item.slug}`}
                      className="block h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
                      onClick={onClose}
                    >
                      <StorefrontImage src={item.imageUrl} alt={item.name} label={item.name} sizes="80px" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.slug}`}
                        className="line-clamp-2 text-sm font-semibold leading-5 text-foreground transition-colors hover:text-primary"
                        onClick={onClose}
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatPrice(item.priceCents, item.currency)}
                      </p>
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 rounded-full px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveWishlistItem(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </StorefrontDrawer>
  );
}
