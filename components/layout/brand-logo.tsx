import Image from 'next/image';
import { cn } from '@/lib/utils';

type TBrandLogoVariant = 'nav' | 'footer' | 'admin';

interface IBrandLogoProps {
  className?: string;
  variant?: TBrandLogoVariant;
}

export function BrandLogo({ className, variant = 'nav' }: IBrandLogoProps) {
  return (
    <span
      className={cn(
        'relative block shrink-0 size-14',
        className,
      )}
    >
      <Image
        src="/store-logo.png"
        alt="PopBox Studio"
        width={40}
        height={40}
        className="h-full w-full object-contain"
        priority={variant === 'nav'}
      />
    </span>
  );
}
