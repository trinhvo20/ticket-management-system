# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

Always use the **Context7 MCP** (`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`) to fetch up-to-date docs before writing code for any library (Bun, Express, Vite, React, Prisma, Tailwind, etc.).

## Project Overview

AI-powered support ticket management system. Inbound emails become tickets; OpenAI (via the Vercel AI SDK) auto-classifies them, generates summaries, and suggests replies using a knowledge base. See `project-scope.md` for full requirements and `implementation-plan.md` for phased task breakdown.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Tailwind CSS, shadcn/ui (Nova preset), React Router, **Axios** (HTTP), **TanStack Query v5** (server state), **Recharts** (charts, via shadcn's `chart` component) — `/client` (Vite, port 5173)
- **Backend**: Express 5 + TypeScript, runs on Bun, **Better Auth** (email/password, DB sessions) — `/server` (port 3001)
- **Shared**: `/core` — internal package (`@ticket/core`) for Zod schemas and types shared between client and server
- **Database**: PostgreSQL via Prisma ORM
- **Jobs**: **pg-boss** (Postgres-backed queue) for background AI classification/auto-resolution — `src/lib/boss.ts`
- **AI**: [OpenAI](https://platform.openai.com/home) via the **Vercel AI SDK** (`ai` + `@ai-sdk/openai`), model `gpt-5-nano-2025-08-07`
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

Bun monorepo with three workspaces: `/core` (shared schemas/types), `/client` (React SPA), and `/server` (Express API). CORS is configured on the server to allow `http://localhost:5173`.

### Core (`/core/src/`)

The `@ticket/core` package holds **Zod schemas and inferred TypeScript types** that are used by both the server and the client. This avoids duplicating validation logic.

- **Schemas** live in `src/schemas/<domain>.ts` (e.g. `src/schemas/user.ts`). Each schema file exports the Zod schema **and** its inferred type (e.g. `createUserSchema` + `CreateUserInput`).
- **Constants** live in `src/constants/<domain>.ts` (e.g. `src/constants/ticket.ts`). These are plain TypeScript interfaces for domain entities — no Zod involved. Use this layer for types that are shared across client and server but don't need runtime validation (e.g. `Ticket`, `TicketDetail`, `User`).
- `src/index.ts` re-exports everything with `export * from './schemas/<domain>'` and `export * from './constants/<domain>'`.
- Import in server or client: `import { createUserSchema, type CreateUserInput, type Ticket } from '@ticket/core'`
- Do **not** add `.default()` to fields in shared schemas — Zod's `.default()` makes the input type optional, which breaks `zodResolver` in react-hook-form. Handle defaults via server logic or `useForm({ defaultValues })` instead.
- Add the package to a new workspace by listing it in the root `package.json` `"workspaces"` array and adding `"@ticket/core": "workspace:*"` to the workspace's `dependencies`, then run `bun install`.
- **Role enum** — use `Role` from `@ticket/core` instead of magic strings. `Role.Admin` = `'admin'`, `Role.Agent` = `'agent'`. Import: `import { Role } from '@ticket/core'`. Never compare or assign role values with raw string literals.

### Server (`/server/src/`)

Planned layers as routes are added:
- **Routes** — auth, users, tickets, AI, email webhooks
- **Middleware** — session-based auth, role checks (admin | agent)
- **Services** — business logic, Claude API wrapper, email provider wrapper
- **Prisma** — DB access; schema at `prisma/schema.prisma`

**Validation** — use **Zod** to validate all request bodies before touching the DB or auth layer. Use the shared `parseBody` helper (`src/lib/parse-body.ts`) in every route handler: `const data = parseBody(schema, req.body, res); if (!data) return` — it calls `safeParse`, sends a `400` with `result.error.issues[0].message` on failure, and returns the typed data on success. Import schemas from `@ticket/core` when the same schema is needed in the client; define server-only schemas locally.

### Email Webhook

- **Endpoint**: `POST /api/webhooks/email` — provider-agnostic; accepts an already-normalized JSON payload and creates a `Ticket`. Shared creation/threading logic lives in `handleInboundEmail` (`src/routes/webhooks.ts`), called by every provider route after it maps to the normalized shape.
- **`POST /api/webhooks/email/cloudmailin`** — for [CloudMailin](https://www.cloudmailin.com/) (used in dev since it needs no owned domain: free inbound address like `random@cloudmailin.net`). Maps CloudMailin's ["Normalized JSON" format](https://docs.cloudmailin.com/http_post_formats/json_normalized/) (`envelope`, `headers.from`/`headers.subject`, `plain`, `html`) to `inboundEmailSchema` via `mapCloudMailinPayload` (`src/lib/inbound-email-providers.ts`). Set CloudMailin's target URL Authorization header to `Bearer <EMAIL_WEBHOOK_SECRET>` — this satisfies `webhookAuth` directly. The mapper also strips quoted reply text (Outlook `____`/`From:`+`Sent:` blocks, Gmail/Apple Mail `On ... wrote:`) via `stripQuotedReply` so only the sender's new message is kept — self-contained regex, no external library (evaluated `email-reply-parser` but it doesn't reliably cover Outlook's format out of the box).
- **Auth**: `webhookAuth` middleware (`src/middleware/webhook.ts`) — checks `Authorization: Bearer <token>` against `EMAIL_WEBHOOK_SECRET` using `crypto.timingSafeEqual`. Applied via `webhooksRouter.use(webhookAuth)` so the router owns its own auth for every sub-route.
- **Payload** (validated by `inboundEmailSchema` from `@ticket/core`): `{ from, fromName, subject, body, bodyHtml?, messageId? }`. `body` max 1,000 chars / `bodyHtml` max 2,000 — provider mappers truncate to fit. `messageId` (RFC 5322 Message-ID, e.g. CloudMailin's `headers.message_id`) is persisted on the `Ticket` only when it starts a new ticket, and anchors outbound threading — see Outbound Email below.
- **Response**: `201 { id, status }` — returns only id and status, not the full row.
- **Rate limit**: 20 req/min (applied in `src/index.ts`, always on, separate from the global production-only limiter).
- **Ticket model**: `id` (autoincrement Int), `subject`, `body`, `bodyHtml?`, `fromEmail`, `fromName`, `status` (default `open`), `category?`, `assignedToId?` → `User`.
- **Local dev exposure**: the server has no public URL of its own, so CloudMailin (or any provider) can't reach `localhost` directly. Run `ngrok http 3001` to get a temporary public URL, then set that as CloudMailin's target (e.g. `https://<ngrok-id>.ngrok-free.dev/api/webhooks/email/cloudmailin`). The ngrok URL changes every time the tunnel restarts on the free tier, so it has to be updated in CloudMailin's address settings after each restart.

### Outbound Email

- When an agent (or the AI auto-resolver) creates a `TicketReply`, it's emailed to the ticket's `fromEmail` via **SendGrid** (`@sendgrid/mail`), using **Single Sender Verification** (verify one email address you own — no domain/DNS needed, same reasoning as using CloudMailin for inbound).
- **Provider wrapper**: `sendEmail` (`src/lib/send-email.ts`) isolates the SendGrid-specific bits — API key, `from` address/name, and setting `In-Reply-To`/`References` headers when threading.
- **Job**: `send-reply-email` queue (`src/services/send-reply-email.ts`), following the same pg-boss pattern as `classify-ticket`/`resolve-ticket` (`enqueueSendReplyEmail` → fast insert; `sendReplyEmail` worker → throws on failure, 3 retries). Registered in `src/index.ts` via `registerSendReplyEmailWorker`.
- **Trigger points**: `POST /:id/replies` in `src/routes/tickets.ts` (human agent reply) and the `canResolve` branch of `autoResolveTicket` (`src/services/resolve-ticket.ts`, AI auto-resolve) — both call `enqueueSendReplyEmail(reply.id)` right after creating the `TicketReply`.
- **Threading**: subject is prefixed `Re: ` (skipped if already present). If the ticket has a `messageId` (captured from the original inbound email), outbound sends set `In-Reply-To`/`References` to it, so replies land in the same thread in the customer's mail client. Anchors to the ticket's root Message-ID only — not a full per-message chain.
- **Scope limit**: no persisted delivery-status field on `TicketReply` — a failed send is retried 3x by pg-boss and logged, same as the other two workers; there's no "failed to send" UI indicator yet.
- **Env vars**: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (the Single-Sender-Verified address), `SENDGRID_FROM_NAME` (defaults to `Support Team`).

### Error Logging (Sentry)

- Server and client each report to their own Sentry project via separate DSNs, set up in `src/lib/sentry.ts` (`Sentry.init()` runs as a side effect on import — must stay the first import in `index.ts`/`main.tsx`).
- **Server** captures only Express route errors, via `Sentry.setupExpressErrorHandler(app)` registered after all routes. Not covered: pg-boss worker failures, `boss.on('error', ...)`.
- **Client** captures only React render crashes, via `<Sentry.ErrorBoundary>` wrapping the app in `main.tsx`. Not covered: axios errors in `lib/api.ts`.
- No DSN set → `Sentry.init()` no-ops (safe for dev/test).
- **Env vars**: `SENTRY_DSN` / `VITE_SENTRY_DSN` (required to enable), `SENTRY_ENVIRONMENT` / `VITE_SENTRY_ENVIRONMENT` (optional, overrides the Sentry `environment` tag — otherwise defaults to `NODE_ENV`/Vite's `MODE`).

### Auth

- **Better Auth** (`src/lib/auth.ts`) — email/password, database sessions via Prisma adapter (`@prisma/client` default output).
- `disableSignUp: true` — no public registration; users are created via `prisma/seed.ts` (uses `auth.$context` to call `internalAdapter.createUser`/`linkAccount` directly, bypassing the disabled sign-up endpoint).
- `user.additionalFields.role` (`admin | agent`, default `agent`, `input: false`) — backed by `Role` enum on `User` in `schema.prisma`.
- Auth handler mounted at `/api/auth/*splat` (before `express.json()`).
- `requireAuth` middleware (`src/middleware/auth.ts`) — calls `auth.api.getSession`, attaches `req.user`/`req.session`. Used by `/api/me`.
- Seed admin: `bun db:seed` (reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env, idempotent).

### Testing strategy

**Default to unit tests.** Use E2E tests only for things unit tests cannot cover.

#### Unit tests (preferred)

- **Stack**: Vitest + React Testing Library + jsdom, configured in `client/vite.config.ts`.
- **Test files**: co-located with pages/components as `*.test.tsx` (e.g. `src/pages/Users.test.tsx`).
- **Setup file**: `src/test/setup.ts` — imports `@testing-library/jest-dom` matchers (runs before every test).
- **Shared helper**: `src/test/render-with-query.tsx` exports `renderWithQuery(ui, options?)` — wraps any element in a fresh `QueryClientProvider` (with `retry: false`). Use this instead of bare `render` whenever the component uses TanStack Query.
- **Mocking**: use `vi.mock('../lib/api', () => ({ ... }))` to mock API functions and `queryClient`. Use `vi.mock('../lib/auth-client', ...)` to mock `useSession`.
- **TanStack Query v5 note**: `mutationFn` receives a second context argument `{ client, meta, mutationKey }` — use `expect.anything()` for that arg in `toHaveBeenCalledWith` assertions.
- **Run**: `bun run test:unit` from root (single run), or `bun run test:run` / `bun run test` inside `/client` for single-run / watch mode. Avoid bare `bun test` at the root — Bun's native test runner picks up Playwright specs and fails.

#### Server unit tests (`/server`, `bun:test`)

- **Stack**: Bun's native test runner. Test files co-located as `*.test.ts` (e.g. `src/services/classify-ticket.test.ts`).
- **Mocking**: `mock.module('../lib/prisma', () => ({ ... }))` to stub dependencies, then `const { fn } = await import('./subject')` to load the real subject-under-test module afterward.
- **`mock.module()` is process-global and leaks across test files** — `bun test` loads every file's top-level code (including `mock.module` calls and dynamic imports) before running any test bodies, so one file's mock can poison another file's import of the same module before that file's own mocks ever take effect. Two rules that keep this safe:
  1. Every test file that calls `mock.module()` must also call `afterAll(() => { mock.restore() })` right after its `mock.module()` calls, so the real module is back in place once that file's tests finish.
  2. **Never `mock.module()` a sibling service module** (e.g. `../services/classify-ticket`) that another test file needs to import for real — that stub can replace the real module before the other file's own dynamic import runs, handing it a stub missing exports it needs. Mock that service's own leaf dependency instead (almost always `../lib/boss`, since `enqueue*` functions are just `boss.send(QUEUE, payload)`) and assert on the shared `boss.send` mock with the real queue-name constant (imported unmocked from the real service module) — see `webhooks.test.ts` or `tickets.replies.test.ts` for the pattern.
- **Run**: `bun test` from `/server` runs the whole suite.

#### E2E tests (only when absolutely necessary)

Write E2E tests **only** for things a unit test structurally cannot cover. Default to unit tests; reach for E2E only when the answer is yes to: *"Does this require a real browser, real auth session, real DB round-trip, or cross-process coordination?"*

**Write E2E for:**
- Auth redirects — `ProtectedRoute` with a real session (not mocked)
- Browser navigation — clicking a link and asserting the URL + rendered content
- Full-stack mutations — verifying a write actually persists (e.g. change status → reload → still Resolved)
- Full-stack reads — data that flows webhook → DB → UI (e.g. ticket appears after webhook)

**Never write E2E for:**
- Rendering logic, field values, loading skeletons, or error messages (unit tests own this)
- Form validation (covered by unit tests with react-hook-form + zodResolver)
- Dropdown option lists or interaction callbacks (covered by unit tests with mocked API)
- Anything already asserted in a unit test — do not duplicate across layers

Use the **`playwright-e2e-writer` agent** to write Playwright E2E tests. Tests live in `e2e/`; run with `bun test:e2e` or `bun test:e2e:ui`.

**Infrastructure** — E2E tests run on dedicated ports, isolated from dev:

| Process | Dev | E2E test |
|---|---|---|
| Server | 3001 (dev DB) | 3099 (test DB) |
| Client | 5173 | 5174 |

- `playwright.config.ts` starts a fresh server on port 3099 (`reuseExistingServer: false`) using `server/.env.test` (which sets `SERVER_URL`, `CLIENT_URL`, and `DATABASE_URL` to the correct test values).
- The test client runs with `bunx vite --mode e2e --port 5174`, which loads `client/.env.e2e` (`VITE_SERVER_URL=http://localhost:3099`).
- **Never** set `reuseExistingServer: true` for the server — this would pick up the running dev server (dev DB) instead of starting a fresh test server.

**Test DB seed** (`server/prisma/seed-test.ts`) — wipes all users then recreates `admin@example.com` and `agent@example.com` (both `password123`). Runs before every `bun test:e2e` via `globalSetup`. The ticket table is NOT wiped — use `Date.now()`-based subjects to identify test-created rows.

**Authoring patterns:**
- **Login helper**: `loginAs(page, 'admin' | 'agent')` — defined locally in each spec (do not import across specs).
- **Never mutate seeded users** — create throwaway users with unique `Date.now()`-based emails for any create/edit/delete flows.
- **Row-scope selectors**: filter by unique text before clicking — `page.getByRole('row').filter({ hasText: email }).getByRole('button', { name: 'Edit user' })`.
- **Exact name matching**: scope to a row and use `{ exact: true }` to avoid substring collisions from parallel tests.

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
SERVER_URL            # Server base URL, used by Better Auth and CORS (http://localhost:3001)
ADMIN_EMAIL           # Seeded admin user email
ADMIN_PASSWORD        # Seeded admin user password
CLIENT_URL            # Client origin for CORS (http://localhost:5173)
OPENAI_API_KEY        # OpenAI API key, used by the Vercel AI SDK for classification, auto-resolution, summaries, and reply polishing (gpt-5-nano-2025-08-07)
SENDGRID_API_KEY      # or MAILGUN_API_KEY
EMAIL_WEBHOOK_SECRET  # HMAC secret for inbound webhook verification
SENTRY_DSN            # Sentry DSN for server-side error reporting (optional; omit to disable)
SENTRY_ENVIRONMENT    # overrides the Sentry `environment` tag (optional; defaults to NODE_ENV)
```

`/client` also has its own `.env` with `VITE_SERVER_URL` (server origin used by the Better Auth client and API calls, default `http://localhost:3001`), `VITE_SENTRY_DSN` (Sentry DSN for client-side error reporting, optional; omit to disable), and `VITE_SENTRY_ENVIRONMENT` (overrides the Sentry `environment` tag, optional; defaults to Vite's `MODE`).
