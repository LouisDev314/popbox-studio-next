export const KUJI_PRIZE_CODES = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z',
  'LO',
] as const;

export type KujiPrizeCode = typeof KUJI_PRIZE_CODES[number];

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
