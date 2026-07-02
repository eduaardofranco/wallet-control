import { PrismaClient } from '@prisma/client';
import { fetchUsdBrl, isCrypto } from '../services/prices.js';
import { aggregatePurchases } from '../services/purchases.js';

const prisma = new PrismaClient();

export async function overview(req, res) {
  const allAssets = await prisma.asset.findMany({
    where: { userId: req.userId },
    include: { dividends: true, purchases: true },
  });

  // The dashboard mirrors the Purchases page: an asset with no purchases logged isn't a real position.
  const assets = allAssets.filter(a => a.purchases.length > 0);

  const usdBrl = await fetchUsdBrl();

  for (const asset of assets) {
    const { quantity, averagePrice } = aggregatePurchases(asset.purchases);
    asset.quantity = quantity;
    asset.averagePrice = averagePrice;
  }

  let totalInvested = 0;
  let totalCurrent = 0;
  let totalDividends = 0;
  const byCategory = {};

  for (const asset of assets) {
    const avgPriceBrl = isCrypto(asset.ticker) ? asset.averagePrice * usdBrl : asset.averagePrice;
    const invested = asset.quantity * avgPriceBrl;
    const current = asset.quantity * asset.currentPrice;
    totalInvested += invested;
    totalCurrent += current;

    for (const d of asset.dividends) {
      totalDividends += d.amount;
    }

    if (!byCategory[asset.category]) {
      byCategory[asset.category] = { invested: 0, current: 0, count: 0 };
    }
    byCategory[asset.category].invested += invested;
    byCategory[asset.category].current += current;
    byCategory[asset.category].count += 1;
  }

  const alerts = assets
    .filter(a => a.ceilingPrice && a.currentPrice <= a.ceilingPrice)
    .map(a => ({
      ticker: a.ticker,
      currentPrice: a.currentPrice,
      ceilingPrice: a.ceilingPrice,
    }));

  const assetList = assets.map(a => {
    const crypto = isCrypto(a.ticker);
    const avgPriceBrl = crypto ? a.averagePrice * usdBrl : a.averagePrice;
    const invested = a.quantity * avgPriceBrl;
    const balance = a.quantity * a.currentPrice;
    const dividendsTotal = a.dividends.reduce((s, d) => s + d.amount, 0);
    const priceChange = avgPriceBrl > 0 ? ((a.currentPrice - avgPriceBrl) / avgPriceBrl) * 100 : 0;
    const returnPct = invested > 0 ? ((balance - invested + dividendsTotal) / invested) * 100 : 0;
    return {
      id: a.id,
      ticker: a.ticker,
      name: a.name,
      category: a.category,
      quantity: a.quantity,
      averagePrice: a.averagePrice,
      averagePriceBrl: avgPriceBrl,
      currentPrice: a.currentPrice,
      ceilingPrice: a.ceilingPrice,
      isCrypto: crypto,
      priceChange,
      returnPct,
      balance,
      percentPortfolio: totalCurrent > 0 ? (balance / totalCurrent) * 100 : 0,
    };
  }).sort((a, b) => b.balance - a.balance);

  res.json({
    totalInvested,
    totalCurrent,
    totalDividends,
    profit: totalCurrent - totalInvested,
    profitPercent: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0,
    byCategory,
    alerts,
    assetList,
    usdBrl,
    totalAssets: assets.length,
  });
}
