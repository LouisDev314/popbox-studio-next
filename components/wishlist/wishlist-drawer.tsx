'use client';

import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { useWishlistStore } from '@/hooks/use-wishlist';
import { cn, formatPrice } from '@/lib/utils';

interface IWishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerButtonId?: string;
}

export function WishlistDrawer(props: IWishlistDrawerProps) {
  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const triggerButtonId = props.triggerButtonId;
  const items = useWishlistStore((state) => state.items);
  const hasHydrated = useWishlistStore((state) => state.hasHydrated);
  const removeWishlistItem = useWishlistStore((state) => state.removeWishlistItem);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.documentElement.style.overflow = 'hidden';

    window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);

      window.requestAnimationFrame(() => {
        const triggerButton = triggerButtonId ? document.getElementById(triggerButtonId) : null;
        triggerButton?.focus();
      });
    };
  }, [isOpen, onClose, triggerButtonId]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[70] bg-foreground/12 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal={true}
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-labelledby={titleId}
        className={cn(
          'fixed inset-y-0 right-0 z-[71] flex w-full max-w-sm flex-col border-l border-border/70 bg-background shadow-[0_24px_60px_-28px_hsl(var(--foreground)/0.4)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isOpen ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
          <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <Heart className="h-5 w-5" />
            Your Wishlist {hasHydrated && items.length > 0 ? `(${items.length})` : null}
          </h2>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!hasHydrated ? (
            <div className="space-y-4">
              <div className="h-6 w-32 rounded-full bg-muted/40" />
              <div className="h-24 rounded-3xl bg-muted/35" />
              <div className="h-24 rounded-3xl bg-muted/25" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-card/70 px-8 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
                <Heart className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">Your wishlist is empty</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Save a few favorites here so you can come back when you are ready to buy.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-border/70 px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                onClick={onClose}
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-[1.75rem] border border-border/70 bg-card/80 p-4 shadow-sm">
                  <div className="flex gap-4">
                    <Link
                      href={`/products/${item.slug}`}
                      className="block h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
                      onClick={onClose}
                    >
                      <StorefrontImage src={item.imageUrl} alt={item.name} label={item.name} />
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
                      <div className="mt-3 flex items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 rounded-full px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeWishlistItem(item.id)}
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
      </aside>
    </>
  );
}
