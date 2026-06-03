# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

Always use the **Context7 MCP** (`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`) to fetch up-to-date docs before writing code for any library (Bun, Express, Vite, React, Prisma, Tailwind, etc.).

## Project Overview

AI-powered support ticket management system. Inbound emails become tickets; Claude API auto-classifies them, generates summaries, and suggests replies using a knowledge base.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Tailwind CSS, React Router — `/client` (Vite, port 5173)
- **Backend**: Express 5 + TypeScript, runs on Bun — `/server` (port 3001)
- **Database**: PostgreSQL via Prisma ORM
- **AI**: Anthropic Claude API
- **Email**: SendGrid or Mailgun
- **Package manager / runtime**: Bun workspaces

## Commands

```bash
# Root
bun dev           # start server + client concurrently
bun build         # build both
bun typecheck     # type-check both workspaces

# /server
bun dev           # bun --watch src/index.ts
bun typecheck     # tsc --noEmit

# /client
bun dev           # vite (http://localhost:5173)
bun build         # tsc -b && vite build
bun lint          # eslint
```

## Architecture

Bun monorepo with two workspaces: `/client` (React SPA) and `/server` (Express API). CORS is configured on the server to allow `http://localhost:5173`.

### Server (`/server/src/`)

Planned layers as routes are added:
- **Routes** — auth, users, tickets, AI, email webhooks
- **Middleware** — session-based auth, role checks (admin | agent)
- **Services** — business logic, Claude API wrapper, email provider wrapper
- **Prisma** — DB access; schema at `prisma/schema.prisma`

### Client (`/client/src/`)

Planned layers:
- **Pages** — Login, Dashboard, Ticket List, Ticket Detail, User Management
- **Router** — React Router with protected routes (redirect to `/login` if unauthenticated)
- **API layer** — centralized fetch wrapper for all server calls

### Domain

- **Users**: `admin` (manages agents) | `agent` (manages tickets)
- **Tickets**: status `open → resolved → closed`; category `general_question | technical_question | refund_request`
- **Data flow**: inbound email → webhook → ticket → AI classification → agent view → reply → outbound email

## Environment Variables

```
DATABASE_URL          # PostgreSQL connection string
SESSION_SECRET        # Express session secret
ANTHROPIC_API_KEY     # Claude API key
SENDGRID_API_KEY      # or MAILGUN_API_KEY
EMAIL_WEBHOOK_SECRET  # HMAC secret for inbound webhook verification
```
