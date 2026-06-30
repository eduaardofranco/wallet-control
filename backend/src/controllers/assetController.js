import { PrismaClient } from '@prisma/client';
import { fetchPrices, fetchUsdBrl, isCrypto, resolveName } from '../services/prices.js';

const prisma = new PrismaClient();

export async function list(req, res) {
  const { category } = req.query;
  const where = { userId: req.userId };
  if (category) where.category = category;

  const assets = await prisma.asset.findMany({
    where,
    include: { dividends: true },
    orderBy: { ticker: 'asc' },
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
    if (isCrypto(asset.ticker)) {
      asset.averagePriceBrl = asset.averagePrice * usdBrl;
      asset.isCrypto = true;
    }
  }

  res.json({ assets, usdBrl });
}

export async function getById(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.id), userId: req.userId },
    include: { dividends: { orderBy: { date: 'desc' } } },
  });
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' });

  const prices = await fetchPrices([asset.ticker]);
  if (prices[asset.ticker] !== undefined) {
    asset.currentPrice = prices[asset.ticker];
    prisma.asset.update({
      where: { id: asset.id },
      data: { currentPrice: prices[asset.ticker] },
    }).catch(() => {});
  }

  res.json(asset);
}

export async function create(req, res) {
  try {
    const { ticker, category, quantity, averagePrice } = req.body;
    if (!ticker || !category) {
      return res.status(400).json({ error: 'Ticker e categoria são obrigatórios' });
    }

    const upperTicker = ticker.toUpperCase();
    const name = resolveName(upperTicker);

    const prices = await fetchPrices([upperTicker]);
    const currentPrice = prices[upperTicker] || 0;

    const asset = await prisma.asset.create({
      data: {
        ticker: upperTicker,
        name,
        category,
        quantity: quantity || 0,
        averagePrice: averagePrice || 0,
        ceilingPrice: null,
        currentPrice,
        userId: req.userId,
      },
    });
    res.status(201).json(asset);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ativo já cadastrado na sua carteira' });
    }
    res.status(500).json({ error: 'Erro ao criar ativo' });
  }
}

export async function update(req, res) {
  try {
    const { quantity, averagePrice, category } = req.body;
    const data = {};
    if (quantity !== undefined) data.quantity = quantity;
    if (averagePrice !== undefined) data.averagePrice = averagePrice;
    if (category !== undefined) data.category = category;

    const result = await prisma.asset.updateMany({
      where: { id: Number(req.params.id), userId: req.userId },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Ativo não encontrado' });

    const updated = await prisma.asset.findUnique({ where: { id: Number(req.params.id) } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar ativo' });
  }
}

export async function remove(req, res) {
  const result = await prisma.asset.deleteMany({
    where: { id: Number(req.params.id), userId: req.userId },
  });
  if (result.count === 0) return res.status(404).json({ error: 'Ativo não encontrado' });
  res.json({ message: 'Ativo removido' });
}
