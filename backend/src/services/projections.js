export const BAZIN_MIN_YIELD = 0.06;

export function computeBazinFields({ dividendPerShare, quantity, averagePrice, currentPrice }) {
  const yieldOnPrice = currentPrice > 0 ? dividendPerShare / currentPrice : 0;
  const yieldOnAvgPrice = averagePrice > 0 ? dividendPerShare / averagePrice : 0;
  const receivedInYear = dividendPerShare * quantity;
  const ceilingPriceBazin = dividendPerShare / BAZIN_MIN_YIELD;
  const safetyMargin = currentPrice > 0 ? (ceilingPriceBazin - currentPrice) / currentPrice : 0;
  return { yieldOnPrice, yieldOnAvgPrice, receivedInYear, ceilingPriceBazin, safetyMargin, approved: safetyMargin >= 0 };
}
