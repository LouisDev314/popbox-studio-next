export type GuestAccessNext = 'order' | 'tickets';

export function normalizeDynamicSegment(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

export function normalizeSearchValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}

export function normalizeGuestAccessNext(value: string | null): GuestAccessNext {
  return value === 'tickets' ? 'tickets' : 'order';
}

export function getGuestOrderPath(publicId: string): string {
  return `/orders/${publicId}`;
}

export function getGuestTicketsPath(publicId: string): string {
  return `/orders/${publicId}/tickets`;
}

export function getGuestAccessPath(
  publicId: string,
  next: GuestAccessNext,
  token: string,
): string {
  const searchParams = new URLSearchParams({
    next,
    token,
  });

  return `/orders/${publicId}/access?${searchParams.toString()}`;
}

export function getGuestAccessFailedPath(
  publicId: string,
  next: GuestAccessNext,
): string {
  const searchParams = new URLSearchParams({
    handoff: 'failed',
  });

  const basePath = next === 'tickets' ? getGuestTicketsPath(publicId) : getGuestOrderPath(publicId);
  return `${basePath}?${searchParams.toString()}`;
}
