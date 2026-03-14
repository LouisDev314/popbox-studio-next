'use client';

import { IProductCard } from '@/interfaces/product';
import Link from 'next/link';
import { formatPrice } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import React from 'react';

export function ProductCard({ product }: { product: IProductCard }) {
  const { theme } = useTheme();
  const isKuji = product.productType === 'kuji';
  const mainImage = product.images?.[0]?.url || '/placeholder.png'; // Assuming generic placeholder handling

  return (
    <div className="group relative flex flex-col gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
      <Link href={`/products/${product.slug}`} className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl z-10">
        <span className="sr-only">View product {product.name}</span>
      </Link>
      
      <div className="relative aspect-square w-full rounded-xl bg-muted/30 overflow-hidden flex items-center justify-center">
        {isKuji && (
          <div className="absolute top-2 left-2 z-20 px-2 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-md shadow-sm">
            Ichiban Kuji
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={mainImage} 
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-in-out"
          loading="lazy"
        />
      </div>

      <div className="flex flex-col gap-1 z-20">
        <h3 className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.collection && (
          <p className="text-sm text-muted-foreground">
            {product.collection.name}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pt-2 z-20">
        <p className="font-bold text-lg text-foreground">
          {formatPrice(product.priceCents, product.currency)}
        </p>
        <Button variant="outline" size="sm" className="pointer-events-none rounded-full border-primary/20 bg-background hover:bg-primary hover:text-primary-foreground group-hover:border-primary">
          View
        </Button>
      </div>
    </div>
  );
}
