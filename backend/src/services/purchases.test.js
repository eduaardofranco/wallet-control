import { describe, expect, it } from 'vitest';
import { aggregatePurchases } from './purchases.js';

describe('aggregatePurchases', () => {
  it('sums quantity and computes the weighted average price', () => {
    const result = aggregatePurchases([
      { quantity: 10, price: 20 },
      { quantity: 30, price: 22 },
    ]);
    expect(result.quantity).toBe(40);
    expect(result.averagePrice).toBeCloseTo((10 * 20 + 30 * 22) / 40);
  });

  it('returns zeroes for an asset with no purchases', () => {
    expect(aggregatePurchases([])).toEqual({ quantity: 0, averagePrice: 0 });
  });

  it('does not divide by zero when total quantity is zero', () => {
    const result = aggregatePurchases([{ quantity: 0, price: 50 }]);
    expect(result).toEqual({ quantity: 0, averagePrice: 0 });
  });
});
