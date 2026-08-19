import { PrismaClient } from '@prisma/client';
import { aggregatePosition } from '../services/purchases.js';
import { computeBazinFields } from '../services/projections.js';

const prisma = new PrismaClient();

export async function list(req, res) {
  const year = Number(req.params.year);

  const allAssets = await prisma.asset.findMany({
    where: { userId: req.userId, category: 'ACAO' },
    include: { purchases: true, sales: true, projections: { where: { year } }, dividends: true },
  });

  const assets = allAssets.filter(a => a.purchases.length > 0);

  const rows = assets.map(asset => {
    const { quantity, averagePrice } = aggregatePosition(asset.purchases, asset.sales);
    const dividendPerShare = asset.projections[0]?.dividendPerShare ?? null;
    const currentIncome = asset.dividends
      .filter(d => d.date.getUTCFullYear() === year)
      .reduce((s, d) => s + d.amount, 0);

    const { ceilingPriceBazin, safetyMargin, approved } = computeBazinFields({
      dividendPerShare: dividendPerShare || 0,
      quantity,
      averagePrice,
      currentPrice: asset.currentPrice,
    });

    const goalQuantity = asset.goalQuantity ?? null;
    const remaining = goalQuantity != null ? Math.max(goalQuantity - quantity, 0) : null;
    const investmentNeeded = remaining != null ? remaining * asset.currentPrice : null;
    const percentRemaining = goalQuantity ? (remaining / goalQuantity) * 100 : null;
    const targetIncome = goalQuantity != null && dividendPerShare != null ? goalQuantity * dividendPerShare : null;

    return {
      assetId: asset.id,
      ticker: asset.ticker,
      quantity,
      goalQuantity,
      remaining,
      currentPrice: asset.currentPrice,
      ceilingPriceBazin,
      safetyMargin,
      approved,
      investmentNeeded,
      currentIncome,
      targetIncome,
      percentRemaining,
    };
  });

  const summary = rows.reduce(
    (acc, r) => ({
      totalInvestmentNeeded: acc.totalInvestmentNeeded + (r.investmentNeeded || 0),
      totalCurrentIncome: acc.totalCurrentIncome + r.currentIncome,
      totalTargetIncome: acc.totalTargetIncome + (r.targetIncome || 0),
    }),
    { totalInvestmentNeeded: 0, totalCurrentIncome: 0, totalTargetIncome: 0 },
  );

  res.json({ rows, summary });
}
