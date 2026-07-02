# Wallet Control

A fullstack personal investment portfolio tracker — log purchases, track dividends, and monitor your positions across stocks, REITs, ETFs, BDRs, crypto, and fixed income.

## Features

- **Purchases, not aggregates** — every buy is logged as its own record (quantity, price, date). Quantity and average price per asset are always computed from that history, so nothing gets flattened into a single misleading number.
- **Manual price control** — current prices are edited inline from the dashboard (no dependency on a third-party quotes API that can go down, rate-limit, or start requiring a paid key).
- **Dashboard** — total invested, current value, profit/loss, dividends received, a category breakdown with an expandable table per category, and a pie chart of portfolio distribution.
- **Ceiling price alerts** — flags assets trading at or below their Bazin-method ceiling price.
- **Dividends** — log dividends/JCP/yield per asset, see monthly totals and a per-asset ranking.
- **Hide values** — one click masks all monetary figures, for screen-sharing.

## Tech Stack

- **Backend:** Node.js (ESM) + Express 5 + Prisma ORM + SQLite
- **Frontend:** React 18 + Vite + React Router + Recharts
- **Auth:** JWT

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone git@github.com:eduaardofranco/wallet-control.git
cd wallet-control
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

Create `backend/.env`:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-real-secret"
PORT=3001
```

Set up the database:

```bash
cd backend
npm run db:migrate
npm run db:seed   # optional: only if you have a matching Excel file to import
```

### Run

From the repo root:

```bash
npm run dev
```

This starts the API on **http://localhost:3001** and the web app on **http://localhost:5173**.

## Scripts

| Location   | Command           | What it does                          |
|------------|-------------------|----------------------------------------|
| root       | `npm run dev`     | Runs backend + frontend together       |
| `backend/` | `npm run dev`     | API only, with auto-restart            |
| `backend/` | `npm test`        | Runs the Vitest suite                  |
| `backend/` | `npm run lint`    | ESLint                                 |
| `backend/` | `npm run db:migrate` | Applies Prisma migrations           |
| `backend/` | `npm run db:seed` | Imports purchase history from an Excel file |
| `frontend/`| `npm run dev`     | Vite dev server                        |
| `frontend/`| `npm run build`   | Production build                       |
| `frontend/`| `npm run lint`    | ESLint                                 |

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for a full breakdown of the data model, backend controllers, frontend pages, and data flow.
