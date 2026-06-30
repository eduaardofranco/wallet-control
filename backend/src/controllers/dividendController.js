import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function list(req, res) {
  const asset = await prisma.asset.findFirst({
    where: { id: Number(req.params.assetId), userId: req.userId },
  });
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' });

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
  if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' });

  const { amount, date, type } = req.body;
  if (!amount || !date) {
    return res.status(400).json({ error: 'Valor e data são obrigatórios' });
  }

  const dividend = await prisma.dividend.create({
    data: {
      amount,
      date: new Date(date),
      type: type || 'DIVIDENDO',
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
    return res.status(404).json({ error: 'Dividendo não encontrado' });
  }

  await prisma.dividend.delete({ where: { id: dividend.id } });
  res.json({ message: 'Dividendo removido' });
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
