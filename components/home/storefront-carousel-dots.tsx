'use client';

import { cn } from '@/lib/utils';

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
    <div className={cn('flex justify-center gap-1.5 md:gap-2', className)}>
      {scrollSnaps.map((_, index) => (
        <button
          key={index}
          type="button"
          className={cn(
            'cursor-pointer rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            index === selectedIndex
              ? 'h-1.5 w-6 bg-primary'
              : 'h-1.5 w-1.5 bg-primary/35 hover:bg-primary/55',
          )}
          onClick={() => onDotClick(index)}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === selectedIndex}
        />
      ))}
    </div>
  );
}
