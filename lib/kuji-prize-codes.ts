import { type IKujiPrize } from '@/interfaces/product';

export const KUJI_PRIZE_CODES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z',
  'LO',
] as const;

export type KujiPrizeCode = typeof KUJI_PRIZE_CODES[number];
export type KujiPrizeTier = KujiPrizeCode;

const KUJI_PRIZE_CODE_SET = new Set<string>(KUJI_PRIZE_CODES);

export function isKujiPrizeCode(value: string): value is KujiPrizeCode {
  return KUJI_PRIZE_CODE_SET.has(value);
}

export function parseKujiPrizeCode(value: string | null | undefined): KujiPrizeCode | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  return isKujiPrizeCode(normalizedValue) ? normalizedValue : null;
}

export const KUJI_PRIZE_TIERS = KUJI_PRIZE_CODES;

export function normalizeKujiPrizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeKujiPrizeTier(value: string): string {
  return value.trim().toUpperCase();
}

function getPrizeTierSortRank(prizeTier: string | null | undefined): number {
  const normalizedTier = normalizeKujiPrizeTier(prizeTier ?? '');

  if (isLastOnePrizeTier(normalizedTier)) {
    return 2;
  }

  if (/^[A-Z](?:\d+)?$/.test(normalizedTier)) {
    return 0;
  }

  return 1;
}

const NATURAL_COLLATOR = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

export function isLastOnePrizeTier(prizeTier: string | null | undefined): boolean {
  return normalizeKujiPrizeTier(prizeTier ?? '') === 'LO';
}

export function compareKujiPrizeTiers(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftRank = getPrizeTierSortRank(left);
  const rightRank = getPrizeTierSortRank(right);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return NATURAL_COLLATOR.compare(
    normalizeKujiPrizeTier(left ?? ''),
    normalizeKujiPrizeTier(right ?? ''),
  );
}

export function compareKujiPrizes<TPrize extends {
  name: string;
  prizeCode: string;
  prizeTier: string;
  sortOrder: number;
}>(left: TPrize, right: TPrize): number {
  const tierComparison = compareKujiPrizeTiers(left.prizeTier, right.prizeTier);

  if (tierComparison !== 0) {
    return tierComparison;
  }

  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  const codeComparison = NATURAL_COLLATOR.compare(left.prizeCode, right.prizeCode);

  if (codeComparison !== 0) {
    return codeComparison;
  }

  return NATURAL_COLLATOR.compare(left.name, right.name);
}

export function groupKujiPrizesByTier(prizes: IKujiPrize[]): Array<{
  items: IKujiPrize[];
  tier: string;
}> {
  const prizeGroups = prizes.reduce<Map<string, IKujiPrize[]>>((groups, prize) => {
    const tier = normalizeKujiPrizeTier(prize.prizeTier);
    const groupItems = groups.get(tier);

    if (groupItems) {
      groupItems.push(prize);
      return groups;
    }

    groups.set(tier, [prize]);
    return groups;
  }, new Map<string, IKujiPrize[]>());

  return Array.from(prizeGroups, ([tier, items]) => ({
    tier,
    items: items.toSorted(compareKujiPrizes),
  })).toSorted((left, right) => compareKujiPrizeTiers(left.tier, right.tier));
}

export function formatKujiPrizeQuantity(remainingQuantity: number, initialQuantity: number): string {
  return `${remainingQuantity} / ${initialQuantity}`;
}

export function getPrizeTierLabel(prizeTier: string | null | undefined): string {
  const normalizedTier = normalizeKujiPrizeTier(prizeTier ?? '');

  if (normalizedTier === '') {
    return 'Unknown Prize Tier';
  }

  if (isLastOnePrizeTier(normalizedTier)) {
    return 'Last One Prize';
  }

  return `Prize ${normalizedTier}`;
}

export function getAdminPrizeTierLabel(prizeTier: string | null | undefined): string {
  return isLastOnePrizeTier(prizeTier) ? 'Last One' : getPrizeTierLabel(prizeTier);
}
