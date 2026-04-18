'use client';

import { useState } from 'react';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { type IProduct } from '@/interfaces/product';
import Image from 'next/image';

interface IProductGalleryProps {
  product: IProduct;
}

export function ProductGallery(props: IProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(0);
  const images = props.product.images;
  const activeImageData = images[activeImage];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/50 bg-muted/20">
        <StorefrontImage
          src={activeImageData?.url}
          alt={activeImageData?.altText || props.product.name}
          label={props.product.name}
          imageClassName="transition-transform duration-500 ease-out"
        />
        {props.product.productType === 'kuji' && (
          <Image
            src="/logo-kuji.png"
            alt="Kuji"
            width={40}
            height={40}
            className="absolute left-4 top-4 z-10 h-10 w-auto"
          />
        )}
        {images.length > 1 && (
          <div className="absolute right-4 bottom-4 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm">
            {activeImage + 1} / {images.length}
          </div>
        )}
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
                  ? 'border-primary bg-primary/5 shadow-sm'
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
