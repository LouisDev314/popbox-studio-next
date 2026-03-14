'use client';

import * as React from 'react';
import { IProduct } from '@/interfaces/product';

export function ProductGallery({ product }: { product: IProduct }) {
  const [activeImage, setActiveImage] = React.useState(0);

  const images = product.images?.length ? product.images : [{ id: '1', url: '/placeholder.png', altText: product.name }];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square w-full rounded-3xl bg-muted/20 overflow-hidden border border-border/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeImage].url}
          alt={images[activeImage].altText || product.name}
          className="object-cover w-full h-full"
        />
        {product.productType === 'kuji' && (
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-bold rounded-lg shadow-sm tracking-wide">
            Ichiban Kuji
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveImage(idx)}
              className={`relative aspect-square w-24 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                activeImage === idx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.altText || ''} className="object-cover w-full h-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
