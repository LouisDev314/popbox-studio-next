'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

interface IStorefrontImageProps {
  alt: string;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
  label?: string;
  sizes?: string;
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
  if (props.src) {
    return (
      <div className={cn('relative h-full w-full', props.className)}>
        <Image
          src={props.src}
          alt={props.alt}
          fill
          sizes={props.sizes ?? '100vw'}
          className={cn('object-cover', props.imageClassName)}
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
        'flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.24),_transparent_58%),linear-gradient(145deg,_hsl(var(--background)),_hsl(var(--muted)/0.85))] text-center',
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