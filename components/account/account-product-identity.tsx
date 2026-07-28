import Link from 'next/link';
import { StorefrontImage } from '@/components/ui/storefront-image';
import { cn } from '@/lib/utils';

interface IAccountProductIdentityProps {
  imageAltText: string | null;
  imageUrl: string | null;
  isStorefrontAccessible: boolean;
  name: string;
  productSlug: string | null;
  storefrontLinkEnabled?: boolean;
  size?: 'compact' | 'regular';
  variantName?: string | null;
  variantSku?: string | null;
}

export function AccountProductIdentity({
  imageAltText,
  imageUrl,
  isStorefrontAccessible,
  name,
  productSlug,
  storefrontLinkEnabled = true,
  size = 'regular',
  variantName,
  variantSku,
}: IAccountProductIdentityProps) {
  const imageClassName = size === 'compact' ? 'h-12 w-12 rounded-md' : 'h-18 w-18 rounded-lg';
  const content = (
    <>
      <span className={cn('shrink-0 overflow-hidden bg-muted', imageClassName)}>
        <StorefrontImage
          src={imageUrl}
          alt={imageAltText ?? name}
          label={name}
          sizes={size === 'compact' ? '48px' : '72px'}
          imageClassName="object-cover"
        />
      </span>
      <span className="min-w-0">
        <span className={cn('block font-medium', size === 'compact' ? 'line-clamp-2 text-sm' : 'line-clamp-2')}>
          {name}
        </span>
        {variantName ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {variantName}{variantSku ? ` · ${variantSku}` : ''}
          </span>
        ) : null}
      </span>
    </>
  );

  if (storefrontLinkEnabled && isStorefrontAccessible && productSlug) {
    return (
      <Link
        href={`/products/${productSlug}`}
        className="group/product inline-flex min-w-0 items-center gap-3 rounded-md hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return <div className="inline-flex min-w-0 items-center gap-3">{content}</div>;
}
