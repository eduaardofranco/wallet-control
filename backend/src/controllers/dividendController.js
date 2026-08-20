import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function listAll(req, res) {
  const dividends = await prisma.dividend.findMany({
    where: { asset: { userId: req.userId } },
    include: { asset: { select: { ticker: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(dividends);
}

export async function createForTicker(req, res) {
  const { ticker, amount, date, type, quantity, unitPrice } = req.body;
  if (!ticker || !amount || !date) {
    return res.status(400).json({ error: 'Ticker, amount and date are required' });
  }

  const asset = await prisma.asset.findFirst({
    where: { ticker: ticker.toUpperCase(), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found — register the asset before logging a dividend for it' });

  const dividend = await prisma.dividend.create({
    data: {
      amount,
      date: new Date(date),
      type: type || 'DIVIDENDO',
      quantity: quantity || null,
      unitPrice: unitPrice || null,
      assetId: asset.id,
    },
    include: { asset: { select: { ticker: true } } },
  });
  res.status(201).json(dividend);
}

export async function list(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const dividends = await prisma.dividend.findMany({
    where: { assetId: asset.id },
    orderBy: { date: 'desc' },
  });
  res.json(dividends);
}

export async function create(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { amount, date, type, quantity, unitPrice } = req.body;
  if (!amount || !date) {
    return res.status(400).json({ error: 'Amount and date are required' });
  }

  const dividend = await prisma.dividend.create({
    data: {
      amount,
      date: new Date(date),
      type: type || 'DIVIDENDO',
      quantity: quantity || null,
      unitPrice: unitPrice || null,
      assetId: asset.id,
    },
  });
  res.status(201).json(dividend);
}

export async function remove(req, res) {
  const dividend = await prisma.dividend.findUnique({
    where: { id: Number(req.params.id) },
    include: { asset: true },
  });
  if (!dividend || dividend.asset.userId !== req.userId) {
    return res.status(404).json({ error: 'Dividend not found' });
  }

  await prisma.dividend.delete({ where: { id: dividend.id } });
  res.json({ message: 'Dividend removed' });
}

export async function summary(req, res) {
  const assets = await prisma.asset.findMany({
    where: { userId: req.userId },
    include: { dividends: true },
  });

  const byMonth = {};
  const byAsset = {};

  for (const asset of assets) {
    let total = 0;
    for (const d of asset.dividends) {
      total += d.amount;
      const key = d.date.toISOString().slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + d.amount;
    }
    if (total > 0) {
      byAsset[asset.ticker] = total;
    }
  }

  res.json({ byMonth, byAsset });
}
