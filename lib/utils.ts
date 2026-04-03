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
    return 'border-border/80 bg-muted/80 text-foreground';
  }

  const percentage = total > 0 ? count / total : 0;

  if (count === 1 || percentage <= 0.15) {
    return 'border-primary/25 bg-accent/80 text-foreground';
  }

  if (percentage <= 0.4 || count <= 5) {
    return 'border-primary/20 bg-accent/60 text-foreground';
  }

  return 'border-border/70 bg-background text-muted-foreground';
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
