'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import type { IStoreBannerSettings } from '@/interfaces/settings';
import { cn } from '@/lib/utils';

const PUBLIC_STORE_BANNER_QUERY_KEY = ['settings', 'store-banner'] as const;

interface IStoreBannerRowProps {
  banner: IStoreBannerSettings;
  className?: string;
}

interface IStorefrontBannerProps {
  onVisibilityChange?: (isVisible: boolean) => void;
}

export function isVisibleStoreBanner(banner: IStoreBannerSettings | null | undefined): banner is IStoreBannerSettings {
  return Boolean(banner?.enabled && banner.message.trim());
}

export function StoreBannerRow(props: IStoreBannerRowProps) {
  const message = props.banner.message.trim();
  const linkLabel = props.banner.linkLabel?.trim() || null;
  const linkHref = props.banner.linkHref?.trim() || null;
  const hasLink = Boolean(linkLabel && linkHref);
  const linkClassName = 'shrink-0 font-bold underline underline-offset-4 transition-opacity hover:opacity-85';

  return (
    <div
      aria-label="Store announcement"
      className={cn(
        'border-b border-primary/20 bg-primary text-primary-foreground',
        props.className,
      )}
    >
      <div className="overflow-x-auto px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="mx-auto flex min-w-max max-w-7xl items-center justify-center gap-3 text-center text-sm font-semibold leading-5 tracking-tight sm:text-[15px]">
          <span className="whitespace-nowrap">{message}</span>
          {hasLink && linkHref?.startsWith('/') ? (
            <Link href={linkHref} className={linkClassName}>
              {linkLabel}
            </Link>
          ) : null}
          {hasLink && linkHref?.startsWith('https://') ? (
            <a href={linkHref} target="_blank" rel="noreferrer" className={linkClassName}>
              {linkLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StorefrontBanner(props: IStorefrontBannerProps) {
  const { onVisibilityChange } = props;
  const { data: bannerResponse } = useCustomizeQuery<IStoreBannerSettings>({
    queryKey: PUBLIC_STORE_BANNER_QUERY_KEY,
    queryFn: QueryConfigs.fetchPublicStoreBanner,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const banner = bannerResponse?.data.data ?? null;
  const isVisible = isVisibleStoreBanner(banner);

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  if (!isVisible) {
    return null;
  }

  return <StoreBannerRow banner={banner} />;
}
