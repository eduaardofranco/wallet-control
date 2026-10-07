import { PrismaClient } from '@prisma/client';
import { fetchUsdBrl, isCrypto } from '../services/prices.js';
import { aggregatePosition } from '../services/purchases.js';

const prisma = new PrismaClient();

export async function overview(req, res) {
  const allAssets = await prisma.asset.findMany({
    where: { userId: req.userId },
    include: { dividends: true, purchases: true, sales: true },
  });

  // The dashboard mirrors the Purchases page: an asset with no purchases logged isn't a real position.
  const assets = allAssets.filter(a => a.purchases.length > 0);

  const usdBrl = await fetchUsdBrl();

  for (const asset of assets) {
    const { quantity, averagePrice } = aggregatePosition(asset.purchases, asset.sales);
    asset.quantity = quantity;
    asset.averagePrice = averagePrice;
  }

  let totalInvested = 0;
  let totalCurrent = 0;
  let totalDividends = 0;
  const byCategory = {};

  for (const asset of assets) {
    const crypto = isCrypto(asset.category);
    // averagePrice/currentPrice are stored in USD for crypto — convert to BRL for portfolio-wide totals.
    const avgPriceBrl = crypto ? asset.averagePrice * usdBrl : asset.averagePrice;
    const currentPriceBrl = crypto ? asset.currentPrice * usdBrl : asset.currentPrice;
    const invested = asset.quantity * avgPriceBrl;
    const current = asset.quantity * currentPriceBrl;
    totalInvested += invested;
    totalCurrent += current;

    const assetDividends = asset.dividends.reduce((s, d) => s + d.amount, 0);
    totalDividends += assetDividends;

    if (!byCategory[asset.category]) {
      byCategory[asset.category] = { invested: 0, current: 0, dividends: 0, count: 0 };
    }
    byCategory[asset.category].invested += invested;
    byCategory[asset.category].current += current;
    byCategory[asset.category].dividends += assetDividends;
    byCategory[asset.category].count += 1;
  }

  const alerts = assets
    .filter(a => {
      const currentPriceBrl = isCrypto(a.category) ? a.currentPrice * usdBrl : a.currentPrice;
      return a.ceilingPrice && currentPriceBrl <= a.ceilingPrice;
    })
    .map(a => ({
      ticker: a.ticker,
      currentPrice: a.currentPrice,
      ceilingPrice: a.ceilingPrice,
      isCrypto: isCrypto(a.category),
    }));

  const assetList = assets.map(a => {
    const crypto = isCrypto(a.category);
    const avgPriceBrl = crypto ? a.averagePrice * usdBrl : a.averagePrice;
    const currentPriceBrl = crypto ? a.currentPrice * usdBrl : a.currentPrice;
    const invested = a.quantity * avgPriceBrl;
    const balance = a.quantity * currentPriceBrl;
    const dividendsTotal = a.dividends.reduce((s, d) => s + d.amount, 0);
    const priceChange = avgPriceBrl > 0 ? ((currentPriceBrl - avgPriceBrl) / avgPriceBrl) * 100 : 0;
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
