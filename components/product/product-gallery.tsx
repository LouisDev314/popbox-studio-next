'use client';

import { useState } from 'react';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type IProduct } from '@/interfaces/product';

interface IProductGalleryProps {
  product: IProduct;
}

export function ProductGallery(props: IProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(0);
  const images = props.product.images;
  const activeImageData = images[activeImage];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-border/50 bg-muted/20">
        <StorefrontImage
          src={activeImageData?.url}
          alt={activeImageData?.altText || props.product.name}
          label={props.product.name}
          imageClassName="transition-transform duration-500 ease-out"
        />
        {props.product.productType === 'kuji' && (
          <div className="absolute top-4 left-4 z-20 rounded-full bg-primary/60 px-3 py-1.5 text-xs font-bold tracking-wider text-secondary-foreground shadow-sm">
            Ichiban Kuji
          </div>
        )}
        {images.length > 1 ? (
          <div className="absolute right-4 bottom-4 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
            {activeImage + 1} / {images.length}
          </div>
        ) : null}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              aria-label={`View image ${idx + 1} of ${images.length}`}
              aria-pressed={activeImage === idx}
              onClick={() => setActiveImage(idx)}
              className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-24 ${
                activeImage === idx
                  ? 'border-primary bg-primary/5 shadow-[0_12px_30px_-22px_hsl(var(--foreground)/0.45)]'
                  : 'border-border/60 hover:border-primary/30'
              }`}
            >
              <StorefrontImage
                src={img.url}
                alt={img.altText || `${props.product.name} thumbnail ${idx + 1}`}
                label={props.product.name}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
