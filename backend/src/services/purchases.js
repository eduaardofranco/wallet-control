export function aggregatePurchases(purchases) {
  const quantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.quantity * p.price, 0);
  const averagePrice = quantity > 0 ? totalCost / quantity : 0;
  return { quantity, averagePrice };
}

export function totalSold(sales) {
  return sales.reduce((sum, s) => sum + s.quantity, 0);
}

// Net position after sales, at the same average cost basis as aggregatePurchases()
// (selling doesn't change the average price of what's left, only the quantity).
export function aggregatePosition(purchases, sales) {
  const { quantity: bought, averagePrice } = aggregatePurchases(purchases);
  const sold = totalSold(sales);
  return { quantity: bought - sold, averagePrice };
}
