import { ReadonlyURLSearchParams } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  getPrizeTierLabel,
  isLastOnePrizeTier,
  normalizeKujiPrizeTier,
} from '@/lib/kuji-prize-codes';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isActiveLink(
  href: string,
  pathname: string,
  currentSearchParams?: URLSearchParams | ReadonlyURLSearchParams,
): boolean {
  if (!href) return false;

  const [targetPath, targetQuery = ''] = href.split('?');

  if (pathname !== targetPath) {
    return false;
  }

  const targetSearchParams = new URLSearchParams(targetQuery);

  for (const [key, value] of targetSearchParams) {
    if (currentSearchParams?.get(key) !== value) {
      return false;
    }
  }

  return true;
}

export function getPrizeStockLabel(count: number, total: number): string {
  if (count <= 0) {
    return 'Sold out';
  }

  if (count === 1) {
    return 'Last one left';
  }

  if (total <= 0) {
    return `${count} left`;
  }

  return `${count} / ${total} left`;
}

export function getPrizeStockClasses(count: number, total: number): string {
  if (count <= 0) {
    return 'border-border bg-muted text-foreground';
  }

  const percentage = total > 0 ? count / total : 0;

  if (percentage <= 0.4 || count <= 5) {
    return 'border-primary bg-accent text-foreground';
  }

  return 'border-border bg-background text-muted-foreground';
}

export function getPrizeBadgeLabel(prizeCode: string): string {
  return getPrizeTierLabel(prizeCode);
}

export function getPrizeBadgeClasses(prizeTier: string): string {
  const code = normalizeKujiPrizeTier(prizeTier);

  if (isLastOnePrizeTier(code)) {
    return 'border-primary/30 bg-accent text-foreground';
  }

  if (code === 'A') {
    return 'border-primary/25 bg-primary/10 text-primary';
  }

  if (code === 'B') {
    return 'border-border/80 bg-muted text-foreground';
  }

  return 'border-border/70 bg-background text-foreground';
}

export function formatPrice(cents: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
