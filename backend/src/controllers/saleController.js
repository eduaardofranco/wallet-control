import { PrismaClient } from '@prisma/client';
import { aggregatePosition } from '../services/purchases.js';

const prisma = new PrismaClient();

export async function listAll(req, res) {
  const sales = await prisma.sale.findMany({
    where: { asset: { userId: req.userId } },
    include: { asset: { select: { ticker: true, category: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(sales);
}

export async function createForTicker(req, res) {
  const { ticker, quantity, price, date } = req.body;
  if (!ticker || !quantity || price === undefined || !date) {
    return res.status(400).json({ error: 'Ticker, quantity, price and date are required' });
  }

  const asset = await prisma.asset.findFirst({
    where: { ticker: ticker.toUpperCase(), userId: req.userId },
    include: { purchases: true, sales: true },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found — you can only sell an asset you already hold' });

  const { quantity: available } = aggregatePosition(asset.purchases, asset.sales);
  if (quantity > available) {
    return res.status(400).json({ error: `Cannot sell more than you own (available: ${available})` });
  }

  const sale = await prisma.sale.create({
    data: {
      quantity,
      price,
      date: new Date(date),
      assetId: asset.id,
    },
    include: { asset: { select: { ticker: true, category: true } } },
  });
  res.status(201).json(sale);
}

export async function list(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const sales = await prisma.sale.findMany({
    where: { assetId: asset.id },
    orderBy: { date: 'desc' },
  });
  res.json(sales);
}

export async function create(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
    include: { purchases: true, sales: true },
  });
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const { quantity, price, date } = req.body;
  if (!quantity || price === undefined || !date) {
    return res.status(400).json({ error: 'Quantity, price and date are required' });
  }

  const { quantity: available } = aggregatePosition(asset.purchases, asset.sales);
  if (quantity > available) {
    return res.status(400).json({ error: `Cannot sell more than you own (available: ${available})` });
  }

  const sale = await prisma.sale.create({
    data: {
      quantity,
      price,
      date: new Date(date),
      assetId: asset.id,
    },
  });
  res.status(201).json(sale);
}

export async function update(req, res) {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(req.params.id) },
    include: { asset: true },
  });
  if (!sale || sale.asset.userId !== req.userId) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  const { quantity, price, date } = req.body;
  const data = {};
  if (quantity !== undefined) data.quantity = quantity;
  if (price !== undefined) data.price = price;
  if (date !== undefined) data.date = new Date(date);

  const updated = await prisma.sale.update({
    where: { id: sale.id },
    data,
  });
  res.json(updated);
}

export async function remove(req, res) {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(req.params.id) },
    include: { asset: true },
  });
  if (!sale || sale.asset.userId !== req.userId) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  await prisma.sale.delete({ where: { id: sale.id } });
  res.json({ message: 'Sale removed' });
}
