# syntax=docker/dockerfile:1.7
# ─── pz-worker — self-hosted image ─────────────────────────────────────────
# Multi-stage build:
#   1. build the React SPA (Vite)
#   2. install runtime deps + bundle the Hono server with esbuild
#   3. run on a slim node runtime
#
# pnpm 11+ requires Node 22.5+ (it imports `node:sqlite`), so we use the
# Node 22 image throughout. The runtime stage uses `node:22-bookworm-slim`
# to keep the final image small.
#
# We use `--shamefully-hoist` in pnpm install so that top-level
# `node_modules/mysql2` (and friends) are created — the bundled server.js
# does `import "mysql2/promise"` and Node looks for the package at the
# top of node_modules, not in `.pnpm/...`.

# ─── Stage 1: client (Vite) ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS client
WORKDIR /app
ENV CI=true \
    HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate && \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:client

# ─── Stage 2: server bundle ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS server
WORKDIR /app
ENV CI=true \
    HUSKY=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate && \
    pnpm install --frozen-lockfile
COPY . .
COPY --from=client /app/dist ./dist
RUN pnpm run build:server

# ─── Stage 3: runtime ──────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    CI=true \
    PORT=8787 \
    HOST=0.0.0.0 \
    STATIC_DIR=/app/dist/client \
    PHOTOS_LOCAL_DIR=/app/storage \
    MIGRATIONS_DIR=/app/src/db/migrations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate && \
    pnpm install --prod --frozen-lockfile --shamefully-hoist
COPY --from=server /app/dist-server ./dist-server
COPY --from=client  /app/dist/client   ./dist/client
COPY --from=server  /app/src/db/migrations ./src/db/migrations
# Make /app owned by the unprivileged `node` user so it can write to the
# photos volume. The `node` user is the default non-root account in the
# official Node images.
RUN mkdir -p /app/storage && chown -R node:node /app
VOLUME ["/app/storage"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||8787) +'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER node
CMD ["node", "dist-server/server.js"]
