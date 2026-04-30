'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface IStorefrontImageProps {
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackSrc?: string | null;
  imageClassName?: string;
  label?: string;
  onImageLoad?: (image: HTMLImageElement) => void;
  sizes?: string;
  skeletonClassName?: string;
  src?: string | null;
  priority?: boolean;
}

function buildFallbackLabel(label: string) {
  const trimmedLabel = label.trim();

  if (!trimmedLabel) {
    return 'PB';
  }

  const words = trimmedLabel.split(/\s+/).slice(0, 2);
  const initials = words.map((word) => word[0]?.toUpperCase() ?? '').join('');

  return initials || trimmedLabel.slice(0, 2).toUpperCase();
}

export function StorefrontImage(props: IStorefrontImageProps) {
  const { onImageLoad } = props;
  const [currentSrc, setCurrentSrc] = useState(props.src ?? null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setCurrentSrc(props.src ?? null);
    setIsLoaded(false);
    setHasError(false);
  }, [props.src, props.fallbackSrc]);

  useEffect(() => {
    const image = imageRef.current;
    let isMounted = true;

    queueMicrotask(() => {
      if (isMounted && image?.complete && image.naturalWidth > 0) {
        setIsLoaded(true);
        onImageLoad?.(image);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentSrc, onImageLoad]);

  if (currentSrc && !hasError) {
    return (
      <div className={cn('relative h-full w-full', props.className)}>
        {!isLoaded ? (
          <Skeleton
            aria-hidden="true"
            data-testid="storefront-image-skeleton"
            className={cn('absolute inset-0 h-full w-full rounded-none', props.skeletonClassName)}
          />
        ) : null}
        <Image
          ref={imageRef}
          src={currentSrc}
          alt={props.alt}
          fill
          sizes={props.sizes ?? '100vw'}
          className={cn(
            'object-cover transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0',
            props.imageClassName,
          )}
          onError={() => {
            if (props.fallbackSrc && currentSrc !== props.fallbackSrc) {
              setCurrentSrc(props.fallbackSrc);
              setIsLoaded(false);
              return;
            }

            setHasError(true);
          }}
          onLoad={(event) => {
            setIsLoaded(true);
            onImageLoad?.(event.currentTarget);
          }}
          priority={props.priority ?? false}
        />
      </div>
    );
  }

  const fallbackLabel = buildFallbackLabel(props.label ?? props.alt);

  return (
    <div
      role="img"
      aria-label={props.alt}
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted/65 text-center',
        props.className,
      )}
    >
      <div
        className={cn(
          'rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm backdrop-blur-sm',
          props.fallbackClassName,
        )}
      >
        {fallbackLabel}
      </div>
    </div>
  );
}
