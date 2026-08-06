import { PrismaClient } from '@prisma/client';
import { aggregatePosition } from '../services/purchases.js';
import { computeBazinFields } from '../services/projections.js';

const prisma = new PrismaClient();

export async function list(req, res) {
  const year = Number(req.params.year);

  const allAssets = await prisma.asset.findMany({
    where: { userId: req.userId },
    include: { purchases: true, sales: true, projections: { where: { year } } },
  });

  // Mirrors the dashboard: an asset with no purchases logged isn't a real position.
  // Bazin is a dividend-yield method for stocks — crypto pays no dividends and fixed income already has a defined return.
  const assets = allAssets.filter(a => a.purchases.length > 0 && a.category === 'ACAO');

  const rows = assets.map(asset => {
    const { quantity, averagePrice } = aggregatePosition(asset.purchases, asset.sales);
    const projection = asset.projections[0] || null;
    const payoutPct = projection?.payoutPct ?? null;
    const dividendPerShare = projection?.dividendPerShare ?? null;

    const bazin = computeBazinFields({
      dividendPerShare: dividendPerShare || 0,
      quantity,
      averagePrice,
      currentPrice: asset.currentPrice,
    });

    return {
      assetId: asset.id,
      ticker: asset.ticker,
      category: asset.category,
      quantity,
      averagePrice,
      currentPrice: asset.currentPrice,
      payoutPct,
      dividendPerShare,
      ...bazin,
    };
  });

  res.json(rows);
}

export async function upsert(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  if (asset.category !== 'ACAO') {
    return res.status(400).json({ error: 'Projections are only available for stocks (ACAO)' });
  }

  const { year, payoutPct, dividendPerShare } = req.body;
  if (!year || dividendPerShare == null) {
    return res.status(400).json({ error: 'Year and dividendPerShare are required' });
  }

  const projection = await prisma.projection.upsert({
    where: { assetId_year: { assetId: asset.id, year: Number(year) } },
    update: { payoutPct: payoutPct ?? null, dividendPerShare },
    create: { assetId: asset.id, year: Number(year), payoutPct: payoutPct ?? null, dividendPerShare },
  });
  res.json(projection);
}

export async function remove(req, res) {
  const projection = await prisma.projection.findUnique({
    where: { id: Number(req.params.id) },
    include: { asset: true },
  });
  if (!projection || projection.asset.userId !== req.userId) {
    return res.status(404).json({ error: 'Projection not found' });
  }

  await prisma.projection.delete({ where: { id: projection.id } });
  res.json({ message: 'Projection removed' });
}
