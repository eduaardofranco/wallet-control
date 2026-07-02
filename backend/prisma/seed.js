import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';

const prisma = new PrismaClient();

export function excelDateToJS(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function categoryMap(cat) {
  if (!cat) return null;
  const c = cat.toLowerCase().trim();
  if (c === 'ações' || c === 'acao') return 'ACAO';
  if (c === 'renda fixa') return 'RENDA_FIXA';
  if (c === 'cripto') return 'CRIPTO';
  if (c === 'fiis' || c === 'fii') return 'FII';
  if (c === 'etfs' || c === 'etf') return 'ETF';
  if (c === 'bdrs' || c === 'bdr') return 'BDR';
  return 'ACAO';
}

async function main() {
  const xlsxPath = '/Users/eduardofranco/Downloads/Carteira Completa última.xlsx';
  const wb = XLSX.readFile(xlsxPath);

  // Create demo user (does not touch any other existing account)
  const hash = await bcrypt.hash('demo12345', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: { name: 'Demo User', email: 'demo@example.com', password: hash },
  });
  console.log('User created/found:', user.email);

  // --- Parse Projeções sheet for asset details ---
  const proj = XLSX.utils.sheet_to_json(wb.Sheets['Projeções'], { header: 1 });
  const assets = {};

  for (let i = 5; i < proj.length; i++) {
    const row = proj[i];
    if (!row || !row[0] || typeof row[0] !== 'string' || row[0].length > 10) continue;
    const ticker = row[0].trim().toUpperCase();
    if (!ticker) continue;

    assets[ticker] = {
      ticker,
      currentPrice: Number(row[3]) || 0,
      ceilingPrice: row[9] ? Number(row[9]) : null,
      category: 'ACAO',
      name: ticker,
    };
  }

  // --- Parse Visão Geral for categories and non-stock assets ---
  const vg = XLSX.utils.sheet_to_json(wb.Sheets['Visão Geral'], { header: 1 });
  for (let i = 10; i < vg.length; i++) {
    const row = vg[i];
    if (!row || !row[0] || typeof row[0] !== 'string') continue;
    const ticker = row[0].trim().toUpperCase();
    const cat = categoryMap(row[1]);
    if (!cat || !ticker) continue;

    if (assets[ticker]) {
      assets[ticker].category = cat;
    } else if (ticker !== 'TOTAL') {
      assets[ticker] = { ticker, name: ticker, category: cat, currentPrice: 0, ceilingPrice: null };
    }
  }

  // --- Parse Compras: each row becomes an individual Purchase entry (not aggregated) ---
  const compras = XLSX.utils.sheet_to_json(wb.Sheets['Compras'], { header: 1 });
  const purchasesByTicker = {};

  function processPurchases(rows, tickerCol, catCol, dateCol, qtyCol, priceCol) {
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[tickerCol] || typeof row[tickerCol] !== 'string') continue;
      const ticker = row[tickerCol].trim().toUpperCase();
      const cat = categoryMap(row[catCol]);
      if (!ticker || !cat) continue;

      const quantity = Number(row[qtyCol]) || 0;
      const price = Number(row[priceCol]) || 0;
      if (quantity === 0) continue;

      const date = excelDateToJS(row[dateCol]) || new Date();

      if (!assets[ticker]) {
        assets[ticker] = { ticker, name: ticker, category: cat, currentPrice: 0, ceilingPrice: null };
      }
      assets[ticker].category = cat;

      if (!purchasesByTicker[ticker]) purchasesByTicker[ticker] = [];
      purchasesByTicker[ticker].push({ quantity, price, date });
    }
  }

  // Left side purchases (cols 0-5)
  processPurchases(compras, 0, 1, 2, 3, 4);
  // Right side purchases (cols 8-13)
  processPurchases(compras, 8, 9, 10, 11, 12);

  // --- Set friendly names ---
  const nameMap = {
    'BBAS3': 'Banco do Brasil',
    'RANI3': 'Irani Papel e Embalagem',
    'BBSE3': 'BB Seguridade',
    'AXIA3': 'Axia Investimentos',
    'ISAE4': 'ISA CTEEP',
    'ETH': 'Ethereum',
    'BTC': 'Bitcoin',
    'XRP': 'XRP (Ripple)',
    'RENDA FIXA': 'Renda Fixa',
  };

  // --- Insert assets and their purchases into database ---
  await prisma.asset.deleteMany({ where: { userId: user.id } });

  let assetCount = 0;
  let purchaseCount = 0;
  for (const [ticker, data] of Object.entries(assets)) {
    if (ticker === 'TOTAL') continue;
    const purchases = purchasesByTicker[ticker] || [];

    const created = await prisma.asset.create({
      data: {
        ticker: data.ticker,
        name: nameMap[data.ticker] || data.ticker,
        category: data.category,
        currentPrice: Math.round(data.currentPrice * 100) / 100,
        ceilingPrice: data.ceilingPrice ? Math.round(data.ceilingPrice * 100) / 100 : null,
        userId: user.id,
        purchases: {
          create: purchases.map(p => ({
            quantity: Math.round(p.quantity * 100000000) / 100000000,
            price: Math.round(p.price * 100) / 100,
            date: p.date,
          })),
        },
      },
    });
    assetCount++;
    purchaseCount += purchases.length;
    console.log(`  + ${created.ticker} (${created.category}) - ${purchases.length} purchase(s)`);
  }

  console.log(`\nImported ${assetCount} assets (${purchaseCount} purchases) for user ${user.email}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
}
