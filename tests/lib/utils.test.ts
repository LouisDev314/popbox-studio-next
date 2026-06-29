import { describe, expect, it } from 'vitest';
import { getPrizeStockClasses } from '@/lib/utils';

describe('getPrizeStockClasses', () => {
  it('returns opaque stock-state classes for prize quantity badges', () => {
    expect(getPrizeStockClasses(0, 10)).toBe('border-border bg-muted text-foreground');
    expect(getPrizeStockClasses(3, 10)).toBe('border-primary bg-accent text-foreground');
    expect(getPrizeStockClasses(6, 10)).toBe('border-border bg-background text-muted-foreground');
  });

  it('keeps one low-stock style for count and percentage thresholds', () => {
    const lowStockClasses = 'border-primary bg-accent text-foreground';

    expect(getPrizeStockClasses(1, 10)).toBe(lowStockClasses);
    expect(getPrizeStockClasses(5, 20)).toBe(lowStockClasses);
    expect(getPrizeStockClasses(6, 15)).toBe(lowStockClasses);
  });
});
