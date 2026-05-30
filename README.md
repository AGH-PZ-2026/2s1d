# pz-worker

Inventory management system — Cloudflare Worker (Hono + Drizzle + Hyperdrive → MySQL) + React SPA.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Framework | [Hono](https://hono.dev/) |
| ORM | [Drizzle](https://orm.drizzle.team/) |
| Database | MySQL via [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) |
| Frontend | React 19 + Vite |

## Quick Start

```bash
# 1. Install dependencies & generate types
npm run setup

# 2. Start MySQL (requires Docker/Colima)
npm run db:start

# 3. Run migrations
npm run db:migrate

# 4. Start dev server (builds frontend automatically)
npm run dev
```

**Open: http://localhost:8787**

## Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Build frontend + start wrangler dev |
| `npm run deploy` | Build frontend + deploy to Cloudflare |
| `npm run setup` | Install deps + generate types |
| `npm run db:start` | Start MySQL via Docker |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:generate` | Generate migration from schema |
| `npm test` | Run tests |
| `npm run check` | TypeScript type check |

## Structure

```
src/
├── index.ts              # Hono app + Worker entry
├── db/
│   ├── schema.ts         # Drizzle schema (categories, item_status)
│   ├── client.ts         # Hyperdrive → mysql2 → Drizzle
│   ├── seed.ts           # System statuses + slug util
│   └── migrations/       # SQL migrations
├── routes/
│   ├── categories.ts     # CRUD + tree + cycle detection
│   └── statuses.ts       # CRUD with system/custom protection
├── middleware/
│   └── db.ts             # Per-request database middleware
└── lib/
    └── errors.ts         # Typed HTTP errors
client/                   # React + Vite frontend
```

## Deployment

```bash
# 1. Create Hyperdrive (once)
wrangler hyperdrive create pz-hyperdrive \
  --connection-string="mysql://user:pass@your-host:3306/db"

# 2. Update wrangler.jsonc with the returned ID (env.production.hyperdrive)

# 3. Deploy
npm run deploy
```
