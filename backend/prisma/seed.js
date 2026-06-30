import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';

const prisma = new PrismaClient();

function excelDateToJS(serial) {
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

  // Create default user
  const hash = await bcrypt.hash('123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'francoeduaardo@gmail.com' },
    update: {},
    create: { name: 'Eduardo Franco', email: 'francoeduaardo@gmail.com', password: hash },
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
      quantity: Number(row[1]) || 0,
      averagePrice: Number(row[2]) || 0,
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
      assets[ticker] = {
        ticker,
        name: ticker,
        category: cat,
        quantity: 0,
        averagePrice: 0,
        currentPrice: 0,
        ceilingPrice: null,
      };
    }
  }

  // --- Parse Compras to compute quantity, averagePrice for non-stock assets ---
  const compras = XLSX.utils.sheet_to_json(wb.Sheets['Compras'], { header: 1 });

  function processPurchases(rows, tickerCol, catCol, qtyCol, priceCol) {
    const buys = {};
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[tickerCol] || typeof row[tickerCol] !== 'string') continue;
      const ticker = row[tickerCol].trim().toUpperCase();
      const cat = categoryMap(row[catCol]);
      if (!ticker || !cat) continue;

      const qty = Number(row[qtyCol]) || 0;
      const price = Number(row[priceCol]) || 0;
      if (qty === 0) continue;

      if (!buys[ticker]) buys[ticker] = { totalQty: 0, totalCost: 0, category: cat };
      buys[ticker].totalQty += qty;
      buys[ticker].totalCost += qty * price;
    }

    for (const [ticker, data] of Object.entries(buys)) {
      if (assets[ticker]) {
        // Update quantity and average price if not already set from Projeções
        if (assets[ticker].quantity === 0 && data.totalQty > 0) {
          assets[ticker].quantity = data.totalQty;
          assets[ticker].averagePrice = data.totalCost / data.totalQty;
        }
        assets[ticker].category = data.category;
      } else {
        assets[ticker] = {
          ticker,
          name: ticker,
          category: data.category,
          quantity: data.totalQty,
          averagePrice: data.totalCost / data.totalQty,
          currentPrice: 0,
          ceilingPrice: null,
        };
      }
    }
  }

  // Left side purchases (cols 0-5)
  processPurchases(compras, 0, 1, 3, 4);
  // Right side purchases (cols 8-13)
  processPurchases(compras, 8, 9, 11, 12);

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

  // --- Insert assets into database ---
  await prisma.asset.deleteMany({ where: { userId: user.id } });

  let count = 0;
  for (const [ticker, data] of Object.entries(assets)) {
    if (ticker === 'TOTAL') continue;
    await prisma.asset.create({
      data: {
        ticker: data.ticker,
        name: nameMap[data.ticker] || data.ticker,
        category: data.category,
        quantity: Math.round(data.quantity * 100000000) / 100000000,
        averagePrice: Math.round(data.averagePrice * 100) / 100,
        currentPrice: Math.round(data.currentPrice * 100) / 100,
        ceilingPrice: data.ceilingPrice ? Math.round(data.ceilingPrice * 100) / 100 : null,
        userId: user.id,
      },
    });
    count++;
    console.log(`  + ${data.ticker} (${data.category}) qty=${data.quantity} pm=${data.averagePrice.toFixed(2)}`);
  }

  console.log(`\nImported ${count} assets for user ${user.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
