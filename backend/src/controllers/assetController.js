import { PrismaClient } from '@prisma/client';
import { fetchUsdBrl, isCrypto, resolveName } from '../services/prices.js';
import { aggregatePosition, aggregatePurchases } from '../services/purchases.js';

const prisma = new PrismaClient();

export async function list(req, res) {
  const { category } = req.query;
  const where = { userId: req.userId };
  if (category) where.category = category;

  const assets = await prisma.asset.findMany({
    where,
    include: { dividends: true, purchases: true, sales: true },
    orderBy: { ticker: 'asc' },
  });

  const usdBrl = await fetchUsdBrl();

  const result = assets.map(asset => {
    const { quantity, averagePrice } = aggregatePosition(asset.purchases, asset.sales);
    const enriched = { ...asset, quantity, averagePrice };
    if (isCrypto(asset.ticker)) {
      enriched.averagePriceBrl = averagePrice * usdBrl;
      enriched.isCrypto = true;
    }
    return enriched;
  });

  res.json({ assets: result, usdBrl });
}

export async function getById(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
    include: {
      dividends: { orderBy: { date: 'desc' } },
      purchases: { orderBy: { date: 'desc' } },
      sales: { orderBy: { date: 'desc' } },
    },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { quantity, averagePrice } = aggregatePosition(asset.purchases, asset.sales);
  res.json({ ...asset, quantity, averagePrice });
}

export async function create(req, res) {
  try {
    const { ticker, category, quantity, averagePrice, purchaseDate } = req.body;
    if (!ticker || !category) {
      return res.status(400).json({ error: 'Ticker and category are required' });
    }

    const upperTicker = ticker.toUpperCase();
    const name = resolveName(upperTicker);

    const asset = await prisma.asset.create({
      data: {
        ticker: upperTicker,
        name,
        category,
        ceilingPrice: null,
        currentPrice: averagePrice || 0,
        userId: req.userId,
        ...(quantity
          ? {
              purchases: {
                create: [{
                  quantity,
                  price: averagePrice || 0,
                  date: purchaseDate ? new Date(purchaseDate) : new Date(),
                }],
              },
            }
          : {}),
      },
      include: { purchases: true },
    });

    const aggregated = aggregatePurchases(asset.purchases);
    res.status(201).json({ ...asset, ...aggregated });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Asset already registered in your portfolio' });
    }
    res.status(500).json({ error: 'Error creating asset' });
  }
}

export async function update(req, res) {
  try {
    const { category, currentPrice } = req.body;
    const data = {};
    if (category !== undefined) data.category = category;
    if (currentPrice !== undefined) data.currentPrice = currentPrice;

    const result = await prisma.asset.updateMany({
      where: { id: Number(req.params.id), userId: req.userId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Asset not found' });

    const updated = await prisma.asset.findUnique({
      where: { id: Number(req.params.id) },
      include: { purchases: true, sales: true },
    });
    res.json({ ...updated, ...aggregatePosition(updated.purchases, updated.sales) });
  } catch {
    res.status(500).json({ error: 'Error updating asset' });
  }
}

export async function remove(req, res) {
  const result = await prisma.asset.deleteMany({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  if (result.count === 0) return res.status(404).json({ error: 'Asset not found' });
  res.json({ message: 'Asset removed' });
}
