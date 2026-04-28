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

export function isLastOnePrizeTier(prizeTier: string | null | undefined): boolean {
  return normalizeKujiPrizeTier(prizeTier ?? '') === 'LO';
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
