# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend**: Node.js (ESM) + Express 5 + Prisma ORM + SQLite, in `backend/`.
- **Frontend**: React 18 + Vite (plain JS, not TS) + react-router-dom + axios + recharts, in `frontend/`.
- Auth: bespoke JWT (7-day expiry), token stored in frontend `localStorage`. No sessions/cookies.

## Running the app

- `npm run dev` from the repo root starts both backend (port 3001) and frontend (port 5173) concurrently.
- Fresh clone setup: `backend/prisma/dev.db` is gitignored, so run `npm run db:migrate` then `npm run db:seed` inside `backend/` before the API has any data.
- Required env vars live in `backend/.env` (gitignored, no `.env.example` exists): `DATABASE_URL`, `JWT_SECRET`, `PORT`.

## Data model

- `Asset.quantity` and `Asset.averagePrice` are **not stored columns** — each purchase is its own `Purchase` row (`quantity`, `price`, `date`), and the asset's total quantity / weighted average price are derived at read time via `aggregatePurchases()` in `backend/src/services/purchases.js`. This mirrors how `Dividend` already works (a separate table keyed by `assetId`), and exists so multiple buys of the same ticker never get flattened into one misleading row. `assetController.js` (`list`/`getById`/`create`/`update`) and `dashboardController.js` all call `aggregatePurchases` on the asset's `purchases` before using `quantity`/`averagePrice` — if you add another place that reads an asset's position, do the same instead of trusting a stored field. `POST /api/assets` accepts an optional `quantity`/`averagePrice`/`purchaseDate` to create the *first* purchase in the same call; further purchases go through `POST /api/purchases/:assetId`.
- **`Asset.currentPrice` is a plain manually-edited column, not fetched from any external API.** There used to be a brapi.dev/CoinGecko/StatusInvest integration for this (removed 2026-07 due to brapi requiring a paid token and rate-limiting to 1 ticker/request, and StatusInvest's scraping being fragile) — now the user edits it inline from the Dashboard page (`frontend/src/pages/Dashboard.jsx`): a pencil icon next to "Current Price" opens a number input, saved via `PUT /api/assets/:id` with `{ currentPrice }`. It defaults to the purchase price when an asset/first-purchase is created (`assetController.create`, `purchaseController.createForTicker`) so it's never silently `0`. Don't reintroduce automatic fetching without checking with the user first — this was a deliberate choice, not a stopgap.
- **`GET /api/dashboard` only includes assets that have at least one `Purchase`** (`dashboardController.overview` filters `allAssets` down to `assets` on `purchases.length > 0`) — the dashboard is meant to mirror real positions from the Purchases page, not stock-watchlist entries created with just a ceiling price and no actual buy. `GET /api/assets` (used by `AssetDetail.jsx`/asset lookups) is intentionally unfiltered. Its response fields are `alerts`, and each `assetList` entry has `priceChange`, `returnPct`, `balance`, `percentPortfolio` (renamed from Portuguese `alertas`/`variacao`/`rentabilidade`/`saldo`/`percentCarteira` during the 2026-07 English pass — keep backend and `Dashboard.jsx` in sync if you touch these).
- `backend/prisma/seed.js` inserts one `Purchase` row per line item in the Excel "Compras" sheet (not aggregated), so `npm run db:seed` reproduces real transaction-level history. Importing `seed.js` (e.g. from a test) does **not** run `main()` — it's guarded by an `import.meta.url` check — so tests can safely import `excelDateToJS` without wiping the dev database.
- `PUT /api/purchases/:id` (`purchaseController.update`) lets a single purchase's `quantity`/`price`/`date` be corrected without deleting and recreating it — it does *not* allow changing which asset/ticker it belongs to (do that by deleting and re-adding). `frontend/src/pages/Purchases.jsx` reuses the same "New Purchase" form for editing, with the ticker/category inputs disabled while `editing` is set.
- Frontend page `frontend/src/pages/Purchases.jsx` (route `/purchases`, formerly `/compras`/`/ativos`) is a flat, ungrouped list of every `Purchase` row across all assets — not one row per ticker. It's backed by `GET/POST /api/purchases` (no `:assetId`), which upserts the `Asset` by ticker if it doesn't exist yet. The per-ticker aggregate view (with dividends and that ticker's own purchase history) still lives at `/assets/:id` (`AssetDetail.jsx`).
- **The project's UI/code language was translated to English in 2026-07, but `Asset.category` (`ACAO`, `FII`, `ETF`, `BDR`, `CRIPTO`, `RENDA_FIXA`) and `Dividend.type` (`DIVIDENDO`, `JCP`, `RENDIMENTO`) values stored in the database are still Portuguese** — this was a deliberate choice to avoid a risky data migration on the user's real portfolio data. The frontend translates them to English purely for display via label maps (`CATEGORY_LABELS` in `Dashboard.jsx`/`Purchases.jsx`, `DIVIDEND_TYPE_LABELS` in `AssetDetail.jsx`) — don't assume the raw `category`/`type` string from the API is already in English.
- **`Dividend.quantity` and `Dividend.unitPrice` are optional context fields, not the source of truth for `amount`.** They mirror the "Quantidade"/"Preço unitário" columns on a B3 (Brazilian exchange) statement export, added so dividends logged from that report keep the same detail as a Purchase. `amount` (the "Valor da Operação" column) must still be entered/stored explicitly — for JCP specifically, Brazil withholds income tax at the source, so `amount` is *not* `quantity * unitPrice`. Don't add a computed-amount shortcut that assumes otherwise.

## Gotchas

- **Price cache**: `backend/src/services/prices.js` holds a 5-minute in-memory cache (`usdBrlCache`) for the USD/BRL exchange rate only (used to convert crypto `averagePrice`, which is stored in USD, to BRL for display). It's process-local and resets on every restart — which happens on every save since `backend` runs via `node --watch`. `fetchUsdBrl` falls back to a hardcoded `5.50` BRL/USD rate if the AwesomeAPI call fails and there's no cached value.
- **Crypto currency conversion is duplicated**: `averagePrice` for `CRIPTO` assets is stored in USD (from purchase entries); both `assetController.js` and `dashboardController.js` independently convert to BRL using the live `usdBrl` rate and expose `usdBrl`/`isCrypto`/`averagePriceBrl`. `currentPrice` for crypto is entered manually in BRL (matching the old CoinGecko convention), so don't multiply it by `usdBrl` — only `averagePrice` needs the conversion.
- **Frontend API base URL is hardcoded** in `frontend/src/services/api.js` (`http://localhost:3001/api`), not env-driven — won't work in any non-localhost deployment without a code change.
- Asset categories (`ACAO, FII, ETF, BDR, CRIPTO, RENDA_FIXA`) and dividend types (`DIVIDENDO, JCP, RENDIMENTO`) are free-text strings in Prisma, not enums.

## Conventions

- `backend/` has a Vitest suite (`npm test` inside `backend/`, pinned to `vitest@^2` — v4 requires Node ≥20.19/22.12 and fails to start on this machine's Node 20.11). No frontend test suite exists yet. Both `backend/` and `frontend/` have ESLint (`npm run lint`, flat config).
- Commit messages: imperative, capitalized English subject line; multi-paragraph body explaining rationale when non-trivial. Commits authored with Claude Code end with a `Co-Authored-By: Claude <model> <noreply@anthropic.com>` trailer.
