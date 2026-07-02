# Wallet Control - System Documentation

## Overview

Fullstack app to manage a personal investment portfolio.
- **Backend:** Node.js + Express + Prisma (SQLite)
- **Frontend:** React + Vite
- **Auth:** JWT (JSON Web Token)

---

## How to Run

```bash
cd ~/wallet-control
npm run dev
```

This starts the backend (port 3001) and frontend (port 5173) at the same time using `concurrently`.

- **URL:** http://localhost:5173
- Sign up for your own account from the Register page, or run `npm run db:seed` inside `backend/` to get a demo account (`demo@example.com` / `demo12345`) pre-loaded with sample purchase history from the Excel import.

---

## Folder Structure

```
wallet-control/
  package.json              <- "dev" script that runs backend + frontend together
  backend/
    .env                    <- environment variables (DB, JWT secret, port)
    prisma/
      schema.prisma         <- database models
      seed.js               <- imports the purchase history from Excel into the DB
      dev.db                <- SQLite database (auto-generated)
    src/
      server.js             <- Express entry point
      middlewares/
        auth.js             <- JWT auth middleware
      controllers/
        authController.js   <- user registration and login
        assetController.js  <- asset CRUD (stocks, crypto, fixed income, etc)
        purchaseController.js <- purchase CRUD (individual lots)
        dividendController.js <- dividend CRUD per asset
        dashboardController.js <- aggregated data for the dashboard
      routes/
        auth.js             <- POST /api/auth/login and /register routes
        assets.js           <- GET/POST/PUT/DELETE /api/assets routes
        purchases.js        <- GET/POST/PUT/DELETE /api/purchases routes
        dividends.js        <- GET/POST/DELETE /api/dividends routes
        dashboard.js        <- GET /api/dashboard route
      services/
        prices.js           <- USD/BRL rate, asset name/category helpers
        purchases.js         <- aggregates purchases into quantity + average price
  frontend/
    src/
      main.jsx              <- React entry point
      App.jsx               <- routes and app structure
      index.css             <- global styles and CSS variables
      context/
        AuthContext.jsx      <- auth context (login/logout/register)
      services/
        api.js              <- axios client configured with a JWT interceptor
      components/
        Layout.jsx + .css   <- nav sidebar + main content area
      pages/
        Login.jsx           <- login screen
        Register.jsx        <- sign-up screen
        Auth.css             <- shared login/sign-up styles
        Dashboard.jsx + .css <- home page with summary and listing (current price editing here)
        Purchases.jsx        <- flat list of every purchase (all dates/assets)
        AssetDetail.jsx      <- detail of one asset: purchases + dividends
        Dividends.jsx        <- dividend summary with charts
```

---

## Database (Prisma + SQLite)

### File: `backend/prisma/schema.prisma`

Four models:

**User** - System user
| Field    | Type     | Description                  |
|----------|----------|-------------------------------|
| id       | Int (PK) | Auto-increment ID            |
| name     | String   | User's name                  |
| email    | String   | Email (unique)                |
| password | String   | Password, bcrypt-hashed       |
| assets   | Asset[]  | The user's assets            |

**Asset** - Financial position. Quantity and average price are **not columns** - they're computed from the asset's `Purchase` rows (see services/purchases.js).
| Field        | Type      | Description                                    |
|--------------|-----------|--------------------------------------------------|
| id           | Int (PK)  | Auto-increment ID                              |
| ticker       | String    | Asset code (e.g. BBAS3, BTC, IPCA+2050)        |
| name         | String    | Display name (resolved automatically)          |
| category     | String    | ACAO, FII, ETF, BDR, CRIPTO, RENDA_FIXA (kept as the original Portuguese codes - see note below) |
| ceilingPrice | Float?    | Ceiling price (optional, Bazin method)         |
| currentPrice | Float     | Current price, edited manually by the user     |
| userId       | Int (FK)  | Owner of the asset                             |
| dividends    | Dividend[]| Dividends received                             |
| purchases    | Purchase[]| Purchase lots (quantity/price/date each)       |

**Purchase** - A single purchase lot
| Field    | Type     | Description                          |
|----------|----------|----------------------------------------|
| id       | Int (PK) | Auto-increment ID                    |
| quantity | Float    | Quantity bought in this lot          |
| price    | Float    | Unit price paid (USD for crypto)     |
| date     | DateTime | Purchase date                        |
| assetId  | Int (FK) | Related asset                        |

**Dividend** - A dividend/income payment received
| Field   | Type     | Description                          |
|---------|----------|----------------------------------------|
| id      | Int (PK) | Auto-increment ID                    |
| amount  | Float    | Amount in R$                         |
| date    | DateTime | Payment date                         |
| type    | String   | DIVIDENDO, JCP or RENDIMENTO (kept as the original Portuguese codes - see note below) |
| assetId | Int (FK) | Related asset                        |

> **Note on `category`/`type` values:** the UI and codebase were translated to English in 2026-07, but the `category` and `type` strings actually stored in the database were deliberately left in Portuguese to avoid a data migration on the user's real portfolio. The frontend maps them to English labels for display only (`CATEGORY_LABELS` in `Dashboard.jsx`/`Purchases.jsx`, `DIVIDEND_TYPE_LABELS` in `AssetDetail.jsx`).

---

## Backend - Details

### server.js
Configures Express with CORS and JSON, registers the 5 main routers (auth, assets, purchases, dividends, dashboard).

### middlewares/auth.js
Extracts the JWT from the `Authorization: Bearer <token>` header, verifies it, and injects `req.userId` for use in controllers. Returns 401 if invalid.

### controllers/authController.js
- **register:** Creates a user with a hashed password (bcrypt), returns a JWT valid for 7 days
- **login:** Validates email/password, returns a JWT

### controllers/assetController.js
- **list:** Lists the user's assets, computes quantity/avg. price from each one's purchases
- **getById:** Returns one asset with dividends + purchases + computed quantity/avg. price
- **create:** Creates an asset from a ticker (name resolved automatically); if `quantity` is given, also creates the 1st purchase
- **update:** Updates `category` and/or `currentPrice` (current price is edited manually)
- **remove:** Deletes the asset, its purchases and dividends (cascade)

For crypto, the average price (computed from purchases) is stored in USD. The list response includes `usdBrl` and `isCrypto` so the frontend can convert it. Crypto `currentPrice` is already entered in BRL by the user, so it doesn't need conversion.

### controllers/purchaseController.js
- **listAll:** Lists all of the user's purchases (across every asset), with the asset's ticker/category embedded - used by the Purchases page
- **createForTicker:** Creates a purchase from a ticker; if the asset doesn't exist yet, creates it automatically (upsert by ticker+user)
- **list / create:** Same thing, but scoped to a specific `assetId` (used by the asset detail page)
- **update:** Corrects the quantity/price/date of an existing purchase, without deleting and recreating it
- **remove:** Removes a purchase

### controllers/dividendController.js
- **list:** Lists an asset's dividends
- **create:** Adds a dividend (amount, date, type)
- **remove:** Removes a dividend
- **summary:** Returns totals grouped by month and by asset (for the charts)

### controllers/dashboardController.js
Returns aggregated data **only for assets that have at least one registered purchase** (watchlist-only assets with just a ceiling price and no actual buy don't show up):
- `totalInvested` - sum of (quantity x avg. price) across all assets
- `totalCurrent` - sum of (quantity x current price)
- `totalDividends` - sum of all dividends
- `profit` / `profitPercent` - total profit/loss
- `byCategory` - invested and current value grouped by category
- `alerts` - assets with current price <= ceiling price
- `assetList` - detailed list of each asset with:
  - `priceChange` - % change between avg. price and current price
  - `returnPct` - total return including dividends
  - `balance` - current value (quantity x current price)
  - `percentPortfolio` - the asset's weight in the total portfolio
  - `averagePriceBrl` - average price converted to BRL (for crypto)
- `usdBrl` - current USD/BRL rate

For crypto, the average price in USD is multiplied by the current USD rate before computing `priceChange` and `returnPct`.

### services/purchases.js
`aggregatePurchases(purchases)` sums the quantity and computes the weighted average price from an asset's purchase list. Used by `assetController.js` and `dashboardController.js` every time they need an asset's position - quantity/avg. price are never stored, always recomputed on the fly.

### services/prices.js
Each asset's current price (`currentPrice`) is edited manually by the user (Dashboard page) - there's no online quote lookup. This service only handles what can't be typed in by hand:

| Function               | Source        | What it's for                                                     |
|-------------------------|---------------|----------------------------------------------------------------------|
| `fetchUsdBrl()`         | AwesomeAPI    | USD/BRL rate, used only to convert crypto avg. price (stored in USD) to BRL for display |
| `resolveName(ticker)`   | internal map  | Friendly name (e.g. BBAS3 -> "Banco do Brasil")                     |
| `isCrypto(ticker)`      | internal map  | Checks whether the ticker is a cryptocurrency                       |

(Until 2026-07 this service fetched quotes online via brapi.dev, CoinGecko and StatusInvest scraping - removed due to instability: brapi started requiring a paid token and capping requests at 1 ticker each, and the StatusInvest scraper broke on any layout change.)

---

## Frontend - Details

### App.jsx
Defines the routes with React Router:
- `/login` and `/register` - public
- `/` (Dashboard), `/purchases`, `/assets/:id`, `/dividends` - protected by `PrivateRoute`

### context/AuthContext.jsx
Manages auth state:
- Stores `user` and `token` in localStorage
- Exposes `login()`, `register()`, `logout()`
- Restores the user from localStorage on load

### services/api.js
Axios client with:
- `baseURL: http://localhost:3001/api`
- Request interceptor: adds the `Authorization` header with the token
- Response interceptor: redirects to `/login` on a 401

### components/Layout.jsx
Fixed sidebar with:
- User's name
- Links: Dashboard, Purchases, Dividends
- Log out button

### pages/Dashboard.jsx
Main page with:
1. **Summary cards** - Total invested, Current value (with %), Dividends received
2. **Hide values button** - hides all monetary values and percentages (also disables price editing, so the real value isn't leaked into the field)
3. **Category sections** (accordion) - each category shows:
   - Header: icon, name, asset count, total value, change, return, % of portfolio
   - Expandable table: ticker, quantity, avg. price, current price, change, return, balance, % of portfolio
   - **Current price is editable**: a pencil icon next to the value opens a number field, saved with `PUT /api/assets/:id { currentPrice }`
   - For crypto: avg. price shown in BRL (with a USD tooltip)
4. **Pie chart** - portfolio distribution by category (Recharts)
5. **Ceiling price alerts** - assets trading below their Bazin ceiling price
6. Only shows assets with at least one purchase logged (see dashboardController.js)

### pages/Purchases.jsx
Flat list of **every purchase** across all assets (one row per lot, not grouped by ticker):
- Filter by category (buttons)
- "New Purchase" form: Ticker, Category, Quantity, Unit Price, Date
  - If the ticker doesn't exist as an asset yet, it's created automatically
  - Name is resolved automatically on the backend
- Edit form (same form, reused): only quantity/price/date are editable - ticker and category are locked (to change the asset, delete and re-add)
- Table with: ticker, category, quantity, date, unit price, total
- Edit and delete buttons per purchase
- Ticker links to `/assets/:id` (the asset detail page)

### pages/AssetDetail.jsx
Detail of one asset with:
- Summary: ticker, name, current price vs. ceiling, total invested (quantity x computed avg. price), profit/loss
- **Purchases section**: list of every purchase for that asset (date, quantity, price, total), with add/remove
- **Dividends section**: add (amount, date, type), list, remove
- Dividend types: Dividend, JCP, Yield

### pages/Dividends.jsx
Dividend summary with:
- Total received
- Monthly bar chart (Recharts)
- Ranking table by asset (total and % of total)

---

## Data Flow

```
User opens the app
  -> Frontend checks the token in localStorage
  -> If missing: redirects to /login
  -> If present: loads the Dashboard

Dashboard:
  -> GET /api/dashboard (with the token in the header)
  -> Backend fetches the user's assets that have at least 1 registered purchase
  -> Backend fetches the USD/BRL rate (AwesomeAPI, only to convert crypto avg. price)
  -> Backend computes change, return, balance, % of portfolio (using the currentPrice stored in the DB)
  -> Returns a JSON with everything aggregated
  -> Frontend renders the cards, category sections, charts

Update current price (manual):
  -> User clicks the pencil next to the price in the Dashboard table
  -> PUT /api/assets/:id { currentPrice }
  -> Frontend reloads the dashboard

Create an asset (with or without a 1st purchase):
  -> POST /api/assets { ticker, category, quantity?, averagePrice?, purchaseDate? }
  -> Backend resolves the name from the ticker
  -> currentPrice starts equal to the given averagePrice (editable afterwards via the pencil)
  -> If quantity was given, also creates the 1st Purchase
  -> Saves to the DB and returns it
  -> Frontend reloads the list

Log a purchase (Purchases page):
  -> POST /api/purchases { ticker, category, quantity, price, date }
  -> Backend creates the Asset if the ticker doesn't exist yet (upsert by ticker+user)
  -> Creates the linked Purchase record
  -> Frontend reloads the purchase list

Edit a purchase:
  -> PUT /api/purchases/:id { quantity, price, date }
  -> Frontend reloads the purchase list

Add a dividend:
  -> POST /api/dividends/:assetId { amount, date, type }
  -> Saves to the DB, linked to the asset
  -> Frontend reloads the asset detail page
```

---

## Data Imported From Excel

The `prisma/seed.js` script reads the `Carteira Completa ultima.xlsx` file and imports **each row of the "Compras" sheet as an individual purchase (Purchase) record**, not aggregated. The quantity and average price below are the totals summed from those records - they reflect the data's state as of the last time the seed ran, not the current portfolio (the user can edit/log purchases directly through the app afterwards).

| Ticker      | Category    | Qty      | Avg. price (original currency) |
|-------------|-------------|----------|----------------------------------|
| BBAS3       | Stock       | 650      | R$ 20.90                        |
| RANI3       | Stock       | 280      | R$ 8.39                         |
| BBSE3       | Stock       | 96       | R$ 35.07                        |
| AXIA3       | Stock       | 0        | -   (ceiling price only, no purchase) |
| ISAE4       | Stock       | 0        | -   (ceiling price only, no purchase) |
| ETH         | Crypto      | 0.58     | US$ 3,999.21                    |
| BTC         | Crypto      | 0.019    | US$ 71,023.39                   |
| XRP         | Crypto      | 761.2    | US$ 1.98                        |

`RENDA FIXA` (a generic lump-sum entry) was imported by the seed but has no market quote; the user has since logged specific Tesouro Direto bonds (`IPCA+2050`, `RENDA+2060`) directly through the Purchases page.
