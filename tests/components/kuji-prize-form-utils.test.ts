import { describe, expect, it } from 'vitest';
import type { IKujiPrize } from '@/interfaces/product';
import {
  buildKujiPrizeCreatePayload,
  buildKujiPrizeUpdatePayload,
  createKujiPrizeFormData,
  getDuplicatePrizeCodeMessage,
  hasDuplicatePrizeCode,
  normalizeKujiPrizeFormData,
} from '@/components/admin/product/kuji-prize-form-utils';

function createPrize(overrides: Partial<IKujiPrize> = {}): IKujiPrize {
  return {
    id: 'prize-1',
    prizeCode: 'A1',
    prizeTier: 'A',
    name: 'Kuromi Plush Doll',
    description: null,
    imageUrl: null,
    initialQuantity: 10,
    remainingQuantity: 8,
    sortOrder: 1,
    ...overrides,
  };
}

describe('kuji-prize-form-utils', () => {
  it('builds create payloads with normalized prize code and tier', () => {
    const normalizedFormData = normalizeKujiPrizeFormData({
      ...createKujiPrizeFormData(),
      prizeCode: ' a1 ',
      prizeTier: 'A',
      name: ' Kuromi Plush Doll ',
      initialQuantity: '10',
      remainingQuantity: '8',
      sortOrder: '1',
    });

    expect(buildKujiPrizeCreatePayload(normalizedFormData)).toMatchObject({
      prizeCode: 'A1',
      prizeTier: 'A',
      name: 'Kuromi Plush Doll',
    });
  });

  it('preserves unchanged prize tier and sends changed prize tier on update', () => {
    const prize = createPrize();

    expect(buildKujiPrizeUpdatePayload(prize, normalizeKujiPrizeFormData(createKujiPrizeFormData(prize)))).toEqual({});

    const changedPayload = buildKujiPrizeUpdatePayload(
      prize,
      normalizeKujiPrizeFormData({
        ...createKujiPrizeFormData(prize),
        prizeTier: 'B',
      }),
    );

    expect(changedPayload).toEqual({ prizeTier: 'B' });
  });

  it('detects duplicate normalized prize codes excluding the current prize', () => {
    const prizes = [
      createPrize({ id: 'prize-1', prizeCode: 'A1' }),
      createPrize({ id: 'prize-2', prizeCode: 'B1' }),
    ];

    expect(hasDuplicatePrizeCode(prizes, ' a1 ')).toBe(true);
    expect(hasDuplicatePrizeCode(prizes, ' a1 ', 'prize-1')).toBe(false);
  });

  it('provides a friendly duplicate prize code message for conflict responses', () => {
    expect(getDuplicatePrizeCodeMessage()).toBe(
      'A prize with this code already exists for this product. Use a unique prize code.',
    );
  });
});
