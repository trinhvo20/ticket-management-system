# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

Always use the **Context7 MCP** (`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`) to fetch up-to-date docs before writing code for any library (Bun, Express, Vite, React, Prisma, Tailwind, etc.).

## Project Overview

AI-powered support ticket management system. Inbound emails become tickets; Claude API auto-classifies them, generates summaries, and suggests replies using a knowledge base.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Tailwind CSS, shadcn/ui (Nova preset), React Router, **Axios** (HTTP), **TanStack Query v5** (server state) — `/client` (Vite, port 5173)
- **Backend**: Express 5 + TypeScript, runs on Bun — `/server` (port 3001)
- **Database**: PostgreSQL via Prisma ORM
- **AI**: Anthropic Claude API
- **Email**: SendGrid or Mailgun
- **Package manager / runtime**: Bun workspaces

## Commands

```bash
# Root
bun dev             # start server + client concurrently
bun build           # build both
bun typecheck       # type-check both workspaces
bun run test:unit   # run client component tests (vitest, single run)
bun test:e2e        # run Playwright E2E tests (uses test DB)
bun test:e2e:ui     # Playwright UI mode

# /server
bun dev             # bun --watch src/index.ts
bun typecheck       # tsc --noEmit
bun db:seed         # seed admin user (reads ADMIN_EMAIL/ADMIN_PASSWORD)

# /client
bun dev             # vite (http://localhost:5173)
bun build           # tsc -b && vite build
bun lint            # eslint
bun test:run        # vitest single run
bun test            # vitest watch mode
```

## Architecture

Bun monorepo with two workspaces: `/client` (React SPA) and `/server` (Express API). CORS is configured on the server to allow `http://localhost:5173`.

### Server (`/server/src/`)

Planned layers as routes are added:
- **Routes** — auth, users, tickets, AI, email webhooks
- **Middleware** — session-based auth, role checks (admin | agent)
- **Services** — business logic, Claude API wrapper, email provider wrapper
- **Prisma** — DB access; schema at `prisma/schema.prisma`

**Validation** — use **Zod** to validate all request bodies before touching the DB or auth layer. Call `schema.safeParse(req.body)`, return a `400` with `result.error.issues[0].message` on failure, and destructure only from `result.data`. See `src/routes/users.ts` for the reference pattern.

### Auth

- **Better Auth** (`src/lib/auth.ts`) — email/password, database sessions via Prisma adapter (`@prisma/client` default output).
- `disableSignUp: true` — no public registration; users are created via `prisma/seed.ts` (uses `auth.$context` to call `internalAdapter.createUser`/`linkAccount` directly, bypassing the disabled sign-up endpoint).
- `user.additionalFields.role` (`admin | agent`, default `agent`, `input: false`) — backed by `Role` enum on `User` in `schema.prisma`.
- Auth handler mounted at `/api/auth/*splat` (before `express.json()`).
- `requireAuth` middleware (`src/middleware/auth.ts`) — calls `auth.api.getSession`, attaches `req.user`/`req.session`. Used by `/api/me`.
- Seed admin: `bun db:seed` (reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env, idempotent).

### Component Testing

- **Stack**: Vitest + React Testing Library + jsdom, configured in `client/vite.config.ts`.
- **Test files**: co-located with pages/components as `*.test.tsx` (e.g. `src/pages/Users.test.tsx`).
- **Setup file**: `src/test/setup.ts` — imports `@testing-library/jest-dom` matchers (runs before every test).
- **Shared helper**: `src/test/render-with-query.tsx` exports `renderWithQuery(ui, options?)` — wraps any element in a fresh `QueryClientProvider` (with `retry: false`). Use this instead of bare `render` whenever the component uses TanStack Query.
- **Mocking**: use `vi.mock('../lib/api', () => ({ ... }))` to mock API functions and `queryClient`. Use `vi.mock('../lib/auth-client', ...)` to mock `useSession`.
- **TanStack Query v5 note**: `mutationFn` receives a second context argument `{ client, meta, mutationKey }` — use `expect.anything()` for that arg in `toHaveBeenCalledWith` assertions.
- **Run**: `bun run test:unit` from root (single run), or `bun run test:run` / `bun run test` inside `/client` for single-run / watch mode. Avoid bare `bun test` at the root — Bun's native test runner picks up Playwright specs and fails.

### E2E Testing

Use the **`playwright-e2e-writer` agent** to write Playwright E2E tests. Invoke it after implementing a significant feature, page, or user flow. Tests live in `e2e/`; run with `bun test:e2e` or `bun test:e2e:ui`.

### Rate Limiting

`express-rate-limit` is applied globally in `src/index.ts` — 100 req / 15 min per IP, only when `NODE_ENV=production`. No-op in development and test.

### Client (`/client/src/`)

- **Pages** (`src/pages/`) — `Login`, `Home` (dashboard), `Users` (admin-only). Planned: Ticket List, Ticket Detail.
- **Router** (`App.tsx`) — React Router; `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) redirects to `/login` if unauthenticated, and accepts an `adminOnly` prop that redirects non-admins to `/`.
- **Nav** (`src/components/Nav.tsx`) — title + nav links/tabs grouped on the left (admin-only links conditional on `session.user.role`), user name + sign out grouped on the right.
- **API layer** (`src/lib/api.ts`) — axios instance (`api`) with `baseURL` from `VITE_SERVER_URL` and `withCredentials: true`; shared `queryClient`; `userKeys` query-key factory. All server calls go through this file.
- **Data fetching** — use **TanStack Query v5** (`useQuery` / `useMutation`) for all server state. Call `queryClient.invalidateQueries` after mutations instead of manually updating local state. Do not use `useState`/`useEffect` for data fetching.
- **Forms** — use **react-hook-form** with `zodResolver` and a **Zod** schema for every form. Define the schema first, infer the type with `z.infer<typeof schema>`, then pass the resolver to `useForm`. Surface field errors via `FieldError` and root/server errors via `setError('root', { message })`. See `src/pages/Users.tsx` for the reference pattern.
- **UI** — shadcn/ui components in `src/components/ui/` (`bunx shadcn@latest add <name>` to add more); use `Field`/`FieldGroup`/`FieldLabel`/`FieldError` for forms (this shadcn version has no `Form`/`FormField` wrapper)

### Domain

- **Users**: `admin` (manages agents) | `agent` (manages tickets)
- **Tickets**: status `open → resolved → closed`; category `general_question | technical_question | refund_request`
- **Data flow**: inbound email → webhook → ticket → AI classification → agent view → reply → outbound email

## Environment Variables

```
DATABASE_URL          # PostgreSQL connection string
BETTER_AUTH_SECRET    # Better Auth session/cookie signing secret
BETTER_AUTH_URL       # Better Auth base URL (http://localhost:3001)
ADMIN_EMAIL           # Seeded admin user email
ADMIN_PASSWORD        # Seeded admin user password
CLIENT_URL            # Client origin for CORS (http://localhost:5173)
ANTHROPIC_API_KEY     # Claude API key
SENDGRID_API_KEY      # or MAILGUN_API_KEY
EMAIL_WEBHOOK_SECRET  # HMAC secret for inbound webhook verification
```

`/client` also has its own `.env` with `VITE_SERVER_URL` (server origin used by the Better Auth client and API calls, default `http://localhost:3001`).
