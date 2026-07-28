import type {
  IAccountKujiResult,
  IAccountKujiResultCollection,
  ICustomerOrderDetail,
  ICustomerPrize,
} from '@/interfaces/account';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizePrize(value: unknown): ICustomerPrize | null {
  if (!isRecord(value)) return null;
  if (typeof value.prizeCode !== 'string' || typeof value.name !== 'string' || typeof value.prizeTier !== 'string') {
    return null;
  }

  return {
    prizeCode: value.prizeCode,
    name: value.name,
    description: nullableString(value.description),
    imageUrl: nullableString(value.imageUrl),
    prizeTier: value.prizeTier,
  };
}

function hasOpaqueResultId(value: unknown): value is UnknownRecord & { id: string } {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim().length > 0;
}

export function normalizeAccountKujiResult(value: unknown): IAccountKujiResult | null {
  if (!hasOpaqueResultId(value)) return null;

  const revealedAt = nullableString(value.revealedAt);

  return {
    id: value.id,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    revealedAt,
    voidedAt: nullableString(value.voidedAt),
    voidReason: nullableString(value.voidReason),
    prize: revealedAt ? normalizePrize(value.prize) : null,
  };
}

export function isAccountKujiResult(
  value: IAccountKujiResult | null | undefined,
): value is IAccountKujiResult {
  return Boolean(value && typeof value.id === 'string' && value.id.trim().length > 0);
}

export function normalizeAccountKujiResults(value: unknown): IAccountKujiResult[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeAccountKujiResult)
    .filter(isAccountKujiResult);
}

export function normalizeAccountKujiResultCollection(value: unknown): IAccountKujiResultCollection {
  if (!isRecord(value)) return { results: [] };

  const rawResults = Array.isArray(value.results)
    ? value.results
    : Array.isArray(value.tickets)
      ? value.tickets
      : [];

  return { results: normalizeAccountKujiResults(rawResults) };
}

export function normalizeAccountOrderDetail(value: unknown): ICustomerOrderDetail {
  const detail = (isRecord(value) ? value : {}) as UnknownRecord & Partial<ICustomerOrderDetail>;
  const legacyResultsByProductId = new Map<string, IAccountKujiResult[]>();

  if (Array.isArray(detail.tickets)) {
    detail.tickets.forEach((ticket) => {
      if (!isRecord(ticket) || !isRecord(ticket.product) || typeof ticket.product.productId !== 'string') return;

      const result = normalizeAccountKujiResult(ticket);
      if (!result) return;

      const current = legacyResultsByProductId.get(ticket.product.productId) ?? [];
      current.push(result);
      legacyResultsByProductId.set(ticket.product.productId, current);
    });
  }

  const items = Array.isArray(detail.items) ? detail.items.filter(isRecord).map((item) => {
    const hasFinalResults = Array.isArray(item.kujiResults);
    const productId = typeof item.productId === 'string' ? item.productId : '';

    return {
      ...item,
      variantId: nullableString(item.variantId),
      variantName: nullableString(item.variantName),
      variantSku: nullableString(item.variantSku),
      kujiResults: hasFinalResults
        ? normalizeAccountKujiResults(item.kujiResults)
        : legacyResultsByProductId.get(productId) ?? [],
    };
  }) : [];

  return {
    ...detail,
    items,
  } as ICustomerOrderDetail;
}
