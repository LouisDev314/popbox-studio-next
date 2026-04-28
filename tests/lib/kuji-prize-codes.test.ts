import { describe, expect, it } from 'vitest';
import {
  compareKujiPrizeTiers,
  compareKujiPrizes,
  formatKujiPrizeQuantity,
  groupKujiPrizesByTier,
} from '@/lib/kuji-prize-codes';
import { type IKujiPrize } from '@/interfaces/product';

function createPrize(overrides: Partial<IKujiPrize>): IKujiPrize {
  return {
    description: null,
    id: overrides.id ?? 'prize',
    imageUrl: null,
    initialQuantity: 10,
    name: 'Prize',
    prizeCode: 'A1',
    prizeTier: 'A',
    remainingQuantity: 3,
    sortOrder: 0,
    ...overrides,
  };
}

describe('kuji-prize-codes', () => {
  it('sorts normal prize tiers first, unknown tiers next, and Last One last', () => {
    const tiers = ['LO', 'B', 'VIP', 'A2', 'A1', 'A'];

    expect(tiers.toSorted(compareKujiPrizeTiers)).toEqual(['A', 'A1', 'A2', 'B', 'VIP', 'LO']);
  });

  it('sorts prizes by tier, sort order, code, and name', () => {
    const prizes = [
      { name: 'Last One', prizeCode: 'LO', prizeTier: 'LO', sortOrder: 0 },
      { name: 'Prize A Two', prizeCode: 'A2', prizeTier: 'A', sortOrder: 1 },
      { name: 'Prize A One', prizeCode: 'A1', prizeTier: 'A', sortOrder: 1 },
      { name: 'Prize B', prizeCode: 'B1', prizeTier: 'B', sortOrder: 0 },
      { name: 'Prize A First', prizeCode: 'A3', prizeTier: 'A', sortOrder: 0 },
    ];

    expect(prizes.toSorted(compareKujiPrizes).map((prize) => prize.name)).toEqual([
      'Prize A First',
      'Prize A One',
      'Prize A Two',
      'Prize B',
      'Last One',
    ]);
  });

  it('formats prize quantities as remaining over initial', () => {
    expect(formatKujiPrizeQuantity(3, 10)).toBe('3 / 10');
    expect(formatKujiPrizeQuantity(1, 1)).toBe('1 / 1');
  });

  it('groups prizes by normalized tier in display order', () => {
    const groups = groupKujiPrizesByTier([
      createPrize({ id: 'lo', name: 'Last One', prizeCode: 'LO', prizeTier: ' lo ', sortOrder: 0 }),
      createPrize({ id: 'b', name: 'Prize B', prizeCode: 'B1', prizeTier: 'B', sortOrder: 0 }),
      createPrize({ id: 'a-2', name: 'Prize A Two', prizeCode: 'A2', prizeTier: 'a', sortOrder: 1 }),
      createPrize({ id: 'unknown', name: 'Unknown Prize', prizeCode: 'VIP1', prizeTier: 'VIP', sortOrder: 0 }),
      createPrize({ id: 'a-1', name: 'Prize A One', prizeCode: 'A1', prizeTier: 'A', sortOrder: 0 }),
    ]);

    expect(groups.map((group) => group.tier)).toEqual(['A', 'B', 'VIP', 'LO']);
    expect(groups[0]?.items.map((prize) => prize.name)).toEqual(['Prize A One', 'Prize A Two']);
    expect(groups.at(-1)?.items.map((prize) => prize.name)).toEqual(['Last One']);
  });
});
