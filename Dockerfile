# Single image for the whole app: the Express server (Bun) serves both /api/* and the
# built React client from the same origin. Repo layout is preserved under /app so
# server-relative paths (../../client/dist, ../../knowledge-base.md) keep working.

ARG BUN_VERSION=1.3.5

# ---- deps: full install (dev deps needed to build the client) ----
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY core/package.json core/
COPY client/package.json client/
COPY server/package.json server/
RUN bun install --frozen-lockfile

# ---- build: compile the client into client/dist ----
FROM deps AS build
COPY . .
# Railway only exposes service variables to Docker builds via ARG; VITE_* are baked in here.
# VITE_SERVER_URL is intentionally unset so the client calls its own origin.
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
RUN bun --filter client build

# ---- prod-deps: production-only node_modules + generated Prisma client ----
FROM oven/bun:${BUN_VERSION} AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
COPY core/package.json core/
COPY client/package.json client/
COPY server/package.json server/
# Only the server (and its workspace dep @ticket/core) runs here — skip client packages
RUN bun install --frozen-lockfile --production --filter server
COPY server/prisma.config.ts server/
COPY server/prisma server/prisma
# prisma.config.ts requires DATABASE_URL; generate doesn't connect, so a placeholder is fine
RUN cd server && DATABASE_URL=postgresql://build:build@localhost:5432/build bunx prisma generate

# ---- runtime ----
FROM oven/bun:${BUN_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=bun:bun /app /app
COPY --from=build --chown=bun:bun /app/core/src core/src
COPY --from=build --chown=bun:bun /app/core/tsconfig.json core/
COPY --from=build --chown=bun:bun /app/server/tsconfig.json /app/server/knowledge-base.md server/
COPY --from=build --chown=bun:bun /app/server/src server/src
COPY --from=build --chown=bun:bun /app/client/dist client/dist
USER bun
WORKDIR /app/server
EXPOSE 3001
CMD ["bun", "src/index.ts"]
