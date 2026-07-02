export function aggregatePurchases(purchases) {
  const quantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.quantity * p.price, 0);
  const averagePrice = quantity > 0 ? totalCost / quantity : 0;
  return { quantity, averagePrice };
}
