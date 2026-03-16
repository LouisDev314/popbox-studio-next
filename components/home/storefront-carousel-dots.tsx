'use client';

import { cn } from '@/utils/helpers';

interface IStorefrontCarouselDotsProps {
  selectedIndex: number;
  scrollSnaps: number[];
  onDotClick: (index: number) => void;
  className?: string;
}

export function StorefrontCarouselDots(props: IStorefrontCarouselDotsProps) {
  const { selectedIndex, scrollSnaps, onDotClick, className } = props;

  if (scrollSnaps.length <= 1) {
    return null;
  }

  return (
    <div className={cn('flex justify-center gap-2', className)}>
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          type="button"
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            index === selectedIndex
              ? 'w-8 bg-primary'
              : 'w-2 bg-primary/40 hover:bg-primary/60',
          )}
          onClick={() => onDotClick(index)}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === selectedIndex}
        />
      ))}
    </div>
  );
}
