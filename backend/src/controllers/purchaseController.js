import { PrismaClient } from '@prisma/client';
import { resolveName } from '../services/prices.js';

const prisma = new PrismaClient();

export async function listAll(req, res) {
  const purchases = await prisma.purchase.findMany({
    where: { asset: { userId: req.userId } },
    include: { asset: { select: { ticker: true, category: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(purchases);
}

export async function createForTicker(req, res) {
  const { ticker, category, quantity, price, date } = req.body;
  if (!ticker || !category || !quantity || price === undefined || !date) {
    return res.status(400).json({ error: 'Ticker, category, quantity, price and date are required' });
  }

  const upperTicker = ticker.toUpperCase();
  const asset = await prisma.asset.upsert({
    where: { ticker_userId: { ticker: upperTicker, userId: req.userId } },
    update: {},
    create: {
      ticker: upperTicker,
      name: resolveName(upperTicker),
      category,
      currentPrice: price,
      userId: req.userId,
    },
  });

  const purchase = await prisma.purchase.create({
    data: {
      quantity,
      price,
      date: new Date(date),
      assetId: asset.id,
    },
    include: { asset: { select: { ticker: true, category: true } } },
  });
  res.status(201).json(purchase);
}

export async function list(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const purchases = await prisma.purchase.findMany({
    where: { assetId: asset.id },
    orderBy: { date: 'desc' },
  });
  res.json(purchases);
}

export async function create(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { quantity, price, date } = req.body;
  if (!quantity || price === undefined || !date) {
    return res.status(400).json({ error: 'Quantity, price and date are required' });
  }

  const purchase = await prisma.purchase.create({
    data: {
      quantity,
      price,
      date: new Date(date),
      assetId: asset.id,
    },
  });
  res.status(201).json(purchase);
}

export async function update(req, res) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: Number(req.params.id) },
    include: { asset: true },
  });
  if (!purchase || purchase.asset.userId !== req.userId) {
    return res.status(404).json({ error: 'Purchase not found' });
  }

  const { quantity, price, date } = req.body;
  const data = {};
  if (quantity !== undefined) data.quantity = quantity;
  if (price !== undefined) data.price = price;
  if (date !== undefined) data.date = new Date(date);

  const updated = await prisma.purchase.update({
    where: { id: purchase.id },
    data,
    include: { asset: { select: { ticker: true, category: true } } },
  });
  res.json(updated);
}

export async function remove(req, res) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: Number(req.params.id) },
    include: { asset: true },
  });
  if (!purchase || purchase.asset.userId !== req.userId) {
    return res.status(404).json({ error: 'Purchase not found' });
  }

  await prisma.purchase.delete({ where: { id: purchase.id } });
  res.json({ message: 'Purchase removed' });
}
