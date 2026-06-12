# pz-worker

System do zarządzania bazą danych aparatury pomiarowej AGH.

Aplikacja jest napisana jako Hono app, którą można uruchomić na dwa sposoby:

| Tryb        | Runtime                    | Kiedy używać                              |
| ----------- | -------------------------- | ----------------------------------------- |
| **Cloudflare** | Cloudflare Workers (workerd) | Produkcja, edge, darmowy tier             |
| **Self-hosted** | Node.js (lub Bun)            | Własny serwer, on-prem, kontener Docker   |

Ten sam kod źródłowy działa w obu trybach — abstrakcja `src/lib/storage.ts` i `src/db/client.ts` pozwala używać Cloudflare R2 / Hyperdrive w trybie CF albo systemu plików / S3 / MinIO / zewnętrznego MySQL w trybie self-hosted.

## Stack

| Warstwa     | Technologia                                            |
| ----------- | ------------------------------------------------------ |
| Runtime     | Cloudflare Workers **lub** Node.js 24+                 |
| Framework   | [Hono](https://hono.dev/)                              |
| Adapter HTTP| `@hono/node-server` (self-hosted)                      |
| ORM         | [Drizzle](https://orm.drizzle.team/) + `drizzle-kit`   |
| DB          | MySQL 8.4 przez Cloudflare Hyperdrive (CF) lub bezpośrednio mysql2 (self-hosted) |
| Frontend    | React 19 + Vite 8 + react-router-dom 7                 |
| Bundler     | Vite (frontend) + esbuild (server bundle)              |
| Testy       | Vitest 3 (`@cloudflare/vitest-pool-workers` dla workera) |
| Środowisko  | Nix (`flake.nix`), `pnpm` jako package manager         |
| Walidacja   | Zod + `@hono/zod-validator`                            |
| Ikony       | lucide-react                                           |
| Obrazy      | R2 (CF) / system plików (self-hosted, default) / S3 (opcja) |

## Szybki start — tryb Cloudflare (developerski)

```bash
nix develop                        # devShell z node + pnpm
docker compose up -d db            # MySQL na localhost:3306
pnpm install
pnpm run db:migrate
pnpm run dev                       # vite build + wrangler dev → localhost:8787
```

## Szybki start — self-hosted (Docker Compose)

```bash
cp .env.example .env
# Uzupełnij JWT_SECRET (np. `openssl rand -hex 32`)
docker compose up -d --build       # MySQL + app na http://localhost:8787
```

Aplikacja działa w jednym kontenerze (`app`) i serwuje zarówno API (`/api/*`), jak i zbudowany frontend React z tego samego portu. Pliki uploadowane jako zdjęcia trafiają do wolumenu `photos_data` (można podmienić na S3 — patrz niżej).

## Szybki start — self-hosted (lokalnie, bez Dockera)

```bash
nix develop
docker compose up -d db            # tylko baza
pnpm install
pnpm run build                     # = build:client + build:server
DATABASE_URL='mysql://pz_user:pz_pass@localhost:3306/pz_db' \
JWT_SECRET='twoj-super-tajny-klucz' \
DEV_BYPASS_AUTH=true \
pnpm start                         # node dist-server/server.js
# → http://localhost:8787
```

## Skrypty

| Komenda                  | Co robi                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `pnpm run dev`           | Cloudflare: build frontu + `wrangler dev`                               |
| `pnpm run dev:server`    | Self-hosted: build frontu + `tsx watch src/server.ts`                  |
| `pnpm run start:dev`     | Self-hosted: tylko tsx (bez watch) — przydatne do debug                |
| `pnpm run build`         | `build:client` + `build:server` (pełny self-hosted build)               |
| `pnpm run build:client`  | Vite build frontu → `dist/client/`                                      |
| `pnpm run build:server`  | esbuild bundle serwera → `dist-server/server.js`                        |
| `pnpm run start`         | `node dist-server/server.js` — produkcyjny self-hosted start            |
| `pnpm run deploy`        | Cloudflare: build + `wrangler deploy`                                   |
| `pnpm run db:migrate`    | Drizzle migrations                                                      |
| `pnpm run db:generate`   | Generuj migrację ze zmian w schema                                      |
| `pnpm run db:seed`       | Seed (statusy systemowe + domyślne lokalizacje)                         |
| `pnpm run check`         | `tsc --noEmit`                                                          |
| `pnpm run lint`          | ESLint                                                                  |
| `pnpm test`              | Wszystkie testy (worker + client)                                       |
| `pnpm run test:client`   | Tylko testy klienckie (lekkie, jsdom)                                   |

## Konfiguracja self-hosted

Cała konfiguracja trafia przez zmienne środowiskowe. Patrz `.env.example`.

### Baza danych

Podaj `DATABASE_URL` albo indywidualne `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE`:

```bash
DATABASE_URL='mysql://pz_user:pz_pass@db:3306/pz_db'
# albo
MYSQL_HOST=db
MYSQL_PORT=3306
MYSQL_USER=pz_user
MYSQL_PASSWORD=pz_pass
MYSQL_DATABASE=pz_db
```

### Magazyn zdjęć

Domyślnie (`PHOTOS_BACKEND=local`) pliki lądują w katalogu `PHOTOS_LOCAL_DIR`
(domyślnie `./storage`, w kontenerze `/app/storage` — zamontowane jako wolumen).

Aby użyć S3 / MinIO / Cloudflare R2 (S3 API), ustaw:

```bash
PHOTOS_BACKEND=s3
S3_ENDPOINT=https://minio.example.com     # albo https://<account>.r2.cloudflarestorage.com
S3_REGION=us-east-1
S3_BUCKET=pz-photos
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=https://photos.example.com   # opcjonalnie, dla CDN-a
```

Adnotacja: w trybie Cloudflare Workers, zamiast tego używany jest binding `PHOTOS_BUCKET` (R2) z `wrangler.jsonc`. Adapter `LocalFsStorage` jest zawsze dostępny jako fallback.

### Auth

```bash
JWT_SECRET=<openssl rand -hex 32>           # wymagane
DEV_BYPASS_AUTH=false                       # true w dev = logowanie przez email
GOOGLE_CLIENT_ID=...                        # opcjonalnie, do OAuth Google
```

## Struktura projektu

```
src/
├── index.ts                  # Hono app — entry point (działa w obu trybach)
├── env.d.ts                  # Typy bindings + Node.js env shape
├── server.ts                 # Self-hosted Node.js entrypoint
├── db/
│   ├── schema.ts             # 12 tabel Drizzle (MySQL)
│   ├── client.ts             # Hyperdrive / DATABASE_URL / MYSQL_* → Drizzle
│   ├── seed.ts               # Systemowe statusy + domyślne lokalizacje + slugify
│   ├── import-koidc.ts       # Skrypt importu z bazy referencyjnej
│   └── migrations/           # Migracje SQL generowane przez drizzle-kit
├── middleware/
│   ├── auth.ts               # JWT (HS256, Web Crypto), authMiddleware
│   └── db.ts                 # dbMiddleware — per-request DB connection
├── lib/
│   ├── errors.ts             # AppError + notFound/badRequest/forbidden/unauthorized
│   ├── storage.ts            # ObjectStorage abstraction (R2/S3/local)
│   └── storageProxy.ts       # /storage/<key> route (self-hosted)
├── routes/                   # Wszystkie handlery API
└── client/                   # React SPA (Vite)
    ├── main.tsx / App.tsx / router.tsx
    ├── components/
    ├── pages/
    ├── services/             # Klienckie serwisy API (z mockami dla MODE=test)
    ├── types/
    └── hooks/

scripts/
└── build-server.mjs          # esbuild bundle → dist-server/server.js

Dockerfile                    # Multi-stage build (client → server → runtime)
docker-compose.yml            # MySQL + app (+ opcjonalne MinIO)
worker-configuration.d.ts     # Generowane przez `wrangler types` — NIE edytować
```

## Jak to działa — tryb self-hosted

1. **`src/server.ts`** wczytuje konfigurację z `process.env` i uruchamia Hono przez `@hono/node-server` na porcie `8787`.
2. Middleware serwuje statyczne pliki z `dist/client/` (output Vite'a) z fallbackiem do `index.html` (SPA).
3. Wszystkie requesty z prefiksem `/api/*` lub `/storage/*` są przekazywane do Hono app.
4. W handlerach:
   - `c.env.DATABASE_URL` (lub `MYSQL_*`) trafia do `src/db/client.ts`, który tworzy połączenie przez `mysql2` (pool z limitem 10).
   - `c.env.PHOTOS_BACKEND` decyduje czy zdjęcia lecą na dysk, do S3 czy do R2.
5. `JWT_SECRET` jest używany do podpisywania tokenów w `src/middleware/auth.ts`.
6. SIGTERM/SIGINT gracefully zamyka pool i kończy proces.

## Jak to działa — tryb Cloudflare

Identyczny kod, ale:
1. `wrangler dev` (lokalnie) lub Cloudflare edge (produkcja) odpala workerd.
2. Bindings (`HYPERDRIVE`, `PHOTOS_BUCKET`, `NOTIFICATION_QUEUE`) z `wrangler.jsonc` trafiają do `c.env`.
3. `dist/client/` jest serwowany przez `assets` binding workerd (nie Node).
4. Hyperdrive automatycznie pooluje połączenia do MySQL.
5. R2 działa jako natywny object storage bez żadnego adaptera.

## Skalowanie self-hosted

- **Pojedynczy serwer**: `pnpm start` lub `docker compose up app` (prosty stack, LXC/VPS).
- **Wiele instancji za load balancerem**: ten sam obraz, współdzielona baza MySQL i storage (lokalny FS wymaga stickiness sesji, lepiej użyć S3/MinIO).
- **Kubernetes**: zobacz `Dockerfile` — image jest samowystarczalny, łatwo go opakować w Deployment + Service.

## Troubleshooting

| Problem                                          | Rozwiązanie                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `Cannot find module 'mysql2'` w kontenerze       | Brakuje `--shamefully-hoist` — patrz `Dockerfile`                 |
| `Missing MySQL connection config`               | Nie ustawiono `DATABASE_URL` ani `MYSQL_*`                        |
| 401 Unauthorized                                 | Token JWT wygasł lub brak `Authorization: Bearer ...`             |
| `Auth not configured`                            | Brak `JWT_SECRET` w env                                           |
| `error:0308010C:digital envelope routines::unsupported` | Starszy Node — użyj Node 22+ (OpenSSL 3)                    |
| Zdjęcia znikają po `docker compose down`         | Nie zamontowano wolumenu `photos_data`                            |

## Więcej informacji

- [`AGENTS.md`](./AGENTS.md) — konwencje kodu, struktura tabel, historia projektu.
- [`wrangler.jsonc`](./wrangler.jsonc) — konfiguracja Cloudflare.
- [Dokumentacja Hono](https://hono.dev/) — framework HTTP.
- [Dokumentacja Drizzle](https://orm.drizzle.team/) — ORM.
