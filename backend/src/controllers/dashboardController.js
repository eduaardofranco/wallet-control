import { PrismaClient } from '@prisma/client';
import { fetchPrices, fetchUsdBrl, isCrypto } from '../services/prices.js';

const prisma = new PrismaClient();

export async function overview(req, res) {
  const assets = await prisma.asset.findMany({
    where: { userId: req.userId },
    include: { dividends: true },
  });

  const tickers = assets.map(a => a.ticker);
  const [prices, usdBrl] = await Promise.all([fetchPrices(tickers), fetchUsdBrl()]);

  for (const asset of assets) {
    if (prices[asset.ticker] !== undefined) {
      asset.currentPrice = prices[asset.ticker];
      prisma.asset.update({
        where: { id: asset.id },
        data: { currentPrice: prices[asset.ticker] },
      }).catch(() => {});
    }
  }

  let totalInvested = 0;
  let totalCurrent = 0;
  let totalDividends = 0;
  const byCategory = {};

  for (const asset of assets) {
    const pmBrl = isCrypto(asset.ticker) ? asset.averagePrice * usdBrl : asset.averagePrice;
    const invested = asset.quantity * pmBrl;
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

  const alertas = assets
    .filter(a => a.ceilingPrice && a.currentPrice <= a.ceilingPrice)
    .map(a => ({
      ticker: a.ticker,
      currentPrice: a.currentPrice,
      ceilingPrice: a.ceilingPrice,
    }));

  const assetList = assets.map(a => {
    const crypto = isCrypto(a.ticker);
    const pmBrl = crypto ? a.averagePrice * usdBrl : a.averagePrice;
    const invested = a.quantity * pmBrl;
    const saldo = a.quantity * a.currentPrice;
    const divs = a.dividends.reduce((s, d) => s + d.amount, 0);
    const variacao = pmBrl > 0 ? ((a.currentPrice - pmBrl) / pmBrl) * 100 : 0;
    const rentabilidade = invested > 0 ? ((saldo - invested + divs) / invested) * 100 : 0;
    return {
      id: a.id,
      ticker: a.ticker,
      name: a.name,
      category: a.category,
      quantity: a.quantity,
      averagePrice: a.averagePrice,
      averagePriceBrl: pmBrl,
      currentPrice: a.currentPrice,
      ceilingPrice: a.ceilingPrice,
      isCrypto: crypto,
      variacao,
      rentabilidade,
      saldo,
      percentCarteira: totalCurrent > 0 ? (saldo / totalCurrent) * 100 : 0,
    };
  }).sort((a, b) => b.saldo - a.saldo);

  res.json({
    totalInvested,
    totalCurrent,
    totalDividends,
    profit: totalCurrent - totalInvested,
    profitPercent: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0,
    byCategory,
    alertas,
    assetList,
    usdBrl,
    totalAssets: assets.length,
  });
}
