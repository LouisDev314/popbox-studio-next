import { ReadonlyURLSearchParams } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    return 'border-rose-200/80 bg-rose-100/90 text-rose-700';
  }

  const percentage = total > 0 ? count / total : 0;

  if (count === 1 || percentage <= 0.15) {
    return 'border-orange-200/80 bg-orange-100/90 text-orange-800';
  }

  if (percentage <= 0.4 || count <= 5) {
    return 'border-amber-200/80 bg-amber-100/90 text-amber-800';
  }

  return 'border-pink-200/80 bg-pink-100/90 text-pink-700';
}

export function getPrizeBadgeLabel(prizeCode: string): string {
  const code = prizeCode.toUpperCase();

  if (code.includes('LAST')) {
    return 'Last Prize';
  }

  return `Prize ${prizeCode}`;
}

export function getPrizeBadgeClasses(prizeCode: string): string {
  const code = prizeCode.toUpperCase();

  if (code.includes('LAST')) {
    return 'border-amber-200/80 bg-[linear-gradient(135deg,rgba(253,230,138,0.92),rgba(251,207,232,0.82))] text-amber-900';
  }

  if (code === 'A') {
    return 'border-pink-200/80 bg-[linear-gradient(135deg,rgba(252,231,243,0.96),rgba(254,205,211,0.82))] text-rose-800';
  }

  if (code === 'B') {
    return 'border-violet-200/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.96),rgba(243,232,255,0.92))] text-violet-800';
  }

  return 'border-secondary/20 bg-secondary/10 text-secondary-foreground';
}

export function formatPrice(cents: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
