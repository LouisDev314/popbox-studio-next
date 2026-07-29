'use client';

import { useState } from 'react';
import { ProductActions } from '@/components/product/product-actions';
import type { IProduct, IStorefrontProductVariant } from '@/interfaces/product';
import { cn, formatPrice } from '@/lib/utils';

function getInitialVariant(product: IProduct): IStorefrontProductVariant | null {
  const variants = product.variants ?? [];

  if (variants.length === 1) {
    return variants[0] ?? null;
  }

  return variants.find((variant) => variant.id === product.defaultVariantId) ?? null;
}

export function StandardProductPurchasePanel({ product }: { product: IProduct }) {
  const variants = [...(product.variants ?? [])].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    () => getInitialVariant(product)?.id ?? null,
  );
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const showSelector = variants.length > 1;

  return (
    <>
      <div className="mt-5 flex flex-wrap items-end gap-2" aria-live="polite">
        <span className="text-2xl font-semibold text-primary">
          {formatPrice(
            selectedVariant?.priceCents ?? product.minPriceCents,
            product.currency,
          )}
        </span>
      </div>

      {showSelector ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-foreground">Variants</legend>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {variants.map((variant) => {
              const isSelected = variant.id === selectedVariantId;

              return (
                <label
                  key={variant.id}
                  className={cn(
                    'flex min-h-12 items-center rounded-xl border px-4 py-3 text-sm transition-colors duration-150',
                    variant.isAvailable
                      ? isSelected
                        ? 'cursor-pointer ring-1 ring-primary ring-offset-0 bg-card hover:bg-primary/10 font-semibold text-primary'
                        : 'cursor-pointer bg-card font-normal hover:bg-primary/10'
                      : 'cursor-not-allowed border-border/40 bg-muted/40 font-normal text-muted-foreground',
                  )}
                >
                  <input
                    type="radio"
                    name="product-variant"
                    value={variant.id}
                    checked={isSelected}
                    disabled={!variant.isAvailable}
                    onChange={() => setSelectedVariantId(variant.id)}
                    className="sr-only"
                  />
                  <span className="min-w-0 break-words leading-snug">
                    {variant.name}
                    {!variant.isAvailable ? (
                      <span className="ml-2 text-xs font-normal">Sold out</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div
        className={cn(
          'mt-5 w-fit rounded-2xl px-4 py-2 text-base font-semibold',
          selectedVariant?.isAvailable
            ? 'bg-primary/12 text-primary'
            : 'bg-destructive/10 text-destructive',
        )}
        role="status"
        aria-live="polite"
      >
        {selectedVariant
          ? selectedVariant.isAvailable ? 'Stock Available' : 'Sold Out'
          : 'This product is currently unavailable.'}
      </div>

      <ProductActions product={product} selectedVariant={selectedVariant} />
    </>
  );
}
