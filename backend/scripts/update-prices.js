#!/usr/bin/env node
/**
 * update-prices.js
 *
 * Applies a { TICKER: price } map to Asset.currentPrice for one user's
 * portfolio, writing straight to the SQLite file via Node's built-in
 * node:sqlite module. This deliberately bypasses Prisma Client so it
 * can run from any machine/OS without hitting the native query-engine
 * binary mismatch (Prisma Client here is generated for darwin-arm64;
 * this script needs to run fine from a Linux automation runner too).
 *
 * Convention (see CLAUDE.md "Data model"): currentPrice is stored in
 * BRL for everything except CRIPTO assets, which are stored in USD.
 * This script does not convert currencies — pass prices already in
 * the right unit for each ticker's category.
 *
 * Usage:
 *   node update-prices.js '{"BBAS3":21.30,"BTC":77553}' [--email you@example.com]
 *
 * Re-introduces automatic price fetching (2026-09), which CLAUDE.md's
 * "Data model" section previously said not to do without asking the
 * user first — this was requested explicitly. Unlike the removed
 * brapi.dev/StatusInvest integration, prices are now fetched by the
 * caller (see the daily scheduled task) from Yahoo Finance's public
 * chart endpoint and CoinGecko's public simple-price endpoint, both
 * free and keyless; this script only applies already-fetched numbers.
 */

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');
const LOG_PATH = path.join(__dirname, '..', 'logs', 'price-updates.log');

const emailFlagIndex = process.argv.indexOf('--email');
const userEmail = emailFlagIndex !== -1 ? process.argv[emailFlagIndex + 1] : 'francoeduaardo@gmail.com';

const pricesArg = process.argv[2];
if (!pricesArg || pricesArg.startsWith('--')) {
  console.error('Usage: node update-prices.js \'{"TICKER":price,...}\' [--email you@example.com]');
  process.exit(1);
}

let prices;
try {
  prices = JSON.parse(pricesArg);
} catch (err) {
  console.error('Invalid JSON payload:', err.message);
  process.exit(1);
}

fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
// The DB file lives on a network/bridge-mounted filesystem when this
// script runs from the daily automation; SQLite's default locking
// scheme errors out there ('disk I/O error') even for a plain write.
// Exclusive locking mode avoids the lock-upgrade dance that trips it up.
db.exec('PRAGMA locking_mode=EXCLUSIVE;');

const user = db.prepare('SELECT id FROM User WHERE email = ?').get(userEmail);
if (!user) {
  console.error(`No user found with email ${userEmail}`);
  process.exit(1);
}

const getAsset = db.prepare('SELECT id, ticker, category, currentPrice FROM Asset WHERE userId = ? AND ticker = ?');
const updateAsset = db.prepare('UPDATE Asset SET currentPrice = ?, updatedAt = ? WHERE id = ?');

const nowIso = new Date().toISOString();
const nowEpoch = Date.now();
const logLines = [];
let updatedCount = 0;
let skippedCount = 0;

for (const [rawTicker, price] of Object.entries(prices)) {
  const ticker = rawTicker.toUpperCase();
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    logLines.push(`${nowIso} SKIP ${ticker} invalid price: ${JSON.stringify(price)}`);
    skippedCount++;
    continue;
  }
  const asset = getAsset.get(user.id, ticker);
  if (!asset) {
    logLines.push(`${nowIso} SKIP ${ticker} not in portfolio for ${userEmail}`);
    skippedCount++;
    continue;
  }
  updateAsset.run(price, nowEpoch, asset.id);
  logLines.push(`${nowIso} OK ${ticker} ${asset.currentPrice} -> ${price}`);
  updatedCount++;
}

db.close();

fs.appendFileSync(LOG_PATH, logLines.join('\n') + '\n');
console.log(logLines.join('\n'));
console.log(`\n${updatedCount} updated, ${skippedCount} skipped.`);
