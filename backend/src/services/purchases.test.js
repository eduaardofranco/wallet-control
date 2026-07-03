import { describe, expect, it } from 'vitest';
import { aggregatePosition, aggregatePurchases, totalSold } from './purchases.js';

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

describe('totalSold', () => {
  it('sums sale quantities', () => {
    expect(totalSold([{ quantity: 5 }, { quantity: 2.5 }])).toBe(7.5);
  });

  it('returns 0 for no sales', () => {
    expect(totalSold([])).toBe(0);
  });
});

describe('aggregatePosition', () => {
  it('subtracts sold quantity from bought quantity, keeping the buy-side average price', () => {
    const purchases = [
      { quantity: 10, price: 20 },
      { quantity: 30, price: 22 },
    ];
    const sales = [{ quantity: 15, price: 25 }];

    const result = aggregatePosition(purchases, sales);

    expect(result.quantity).toBe(25);
    expect(result.averagePrice).toBeCloseTo((10 * 20 + 30 * 22) / 40);
  });

  it('matches aggregatePurchases when there are no sales', () => {
    const purchases = [{ quantity: 10, price: 20 }];
    expect(aggregatePosition(purchases, [])).toEqual(aggregatePurchases(purchases));
  });

  it('allows quantity to go negative if oversold (no clamping — that is validated at the API layer)', () => {
    const result = aggregatePosition([{ quantity: 10, price: 20 }], [{ quantity: 15, price: 25 }]);
    expect(result.quantity).toBe(-5);
  });
});
