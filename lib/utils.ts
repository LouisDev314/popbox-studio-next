import { ReadonlyURLSearchParams } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isActiveLink(
  href: string,
  pathname: string,
  currentSearchParams?: URLSearchParams | ReadonlyURLSearchParams
): boolean {
  if (!href) return false;
  
  const [hrefPathname, hrefQueryString] = href.split('?');

  if (pathname !== hrefPathname) {
    return false;
  }

  const targetSearchParams = new URLSearchParams(hrefQueryString ?? '');

  if ([...targetSearchParams.keys()].length === 0) {
    if (currentSearchParams && currentSearchParams.has('type')) {
       return false;
    }
    return true;
  }

  if (!currentSearchParams) return true;

  for (const [key, value] of targetSearchParams.entries()) {
    if (currentSearchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

export function getStockColor(count: number, total: number): string {
  if (count === 0) return 'text-destructive';
  if (count === 1) return 'text-red-500 font-bold font-semibold';
  
  const percentage = count / total;
  if (percentage <= 0.2 || count <= 5) return 'text-amber-500 font-medium';
  
  return 'text-pink-600 font-medium'; 
}

export function getPrizeBadgeColor(prizeCode: string): string {
  const code = prizeCode.toUpperCase();
  if (code.includes('LAST')) return 'bg-amber-200 text-amber-700';
  if (code === 'A') return 'bg-pink-200 text-pink-700';
  if (code === 'B') return 'bg-purple-200 text-purple-700';
  
  return 'bg-secondary/20 text-secondary-foreground';
}
