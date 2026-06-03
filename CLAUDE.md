# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI-powered support ticket management system. Inbound emails become tickets; Claude API auto-classifies them, generates summaries, and suggests replies using a knowledge base.

## Tech Stack

- **Frontend**: React + TypeScript, Tailwind CSS, React Router (`/client`)
- **Backend**: Node.js + Express + TypeScript (`/server`)
- **Database**: PostgreSQL via Prisma ORM
- **AI**: Anthropic Claude API (classification, summaries, suggested replies)
- **Email**: SendGrid or Mailgun (inbound webhooks + outbound sending)
- **Deployment**: Docker + Docker Compose

## Commands

> The project has not been scaffolded yet. Once set up, commands will follow this convention:

```bash
# Root (monorepo)
npm run dev          # start both client and server in watch mode
npm run build        # build client and server

# Server (/server)
npm run dev          # ts-node-dev / nodemon watch
npm run build        # tsc
npm test             # jest
npm test -- --testPathPattern=<file>   # run a single test file

# Client (/client)
npm run dev          # vite dev server
npm run build        # vite build
npm run lint         # eslint
```

Update this section with actual commands once Phase 1 scaffolding is complete.

## Architecture

### Monorepo Layout (planned)

```
/client   React SPA
/server   Express API + Prisma
```

### Backend layers (`/server`)

- **Routes** — Express route definitions (auth, users, tickets, AI, email webhooks)
- **Middleware** — session-based auth guard, role checks (admin vs agent)
- **Controllers / Services** — business logic called by routes
- **Prisma** — database access; schema lives in `prisma/schema.prisma`
- **AI service** — wraps Claude API calls for classification, summary, suggested reply
- **Email service** — wraps SendGrid/Mailgun SDK; inbound webhook parses emails into tickets

### Frontend layers (`/client`)

- **Pages** — Login, Dashboard, Ticket List, Ticket Detail, User Management (admin only)
- **React Router** — client-side routing with protected routes (redirect to `/login` if unauthenticated)
- **API layer** — centralized fetch/axios wrapper for all server calls

### Data model (core entities)

- `User` — roles: `admin` | `agent`
- `Ticket` — status: `open` | `resolved` | `closed`; category: `general_question` | `technical_question` | `refund_request`; linked to assignee agent
- `KnowledgeBase` — articles used to ground AI-suggested replies

### Key data flows

1. **Inbound email** → email provider webhook → `POST /webhooks/email` → create Ticket → trigger AI classification
2. **Ticket open** → `GET /tickets/:id` → AI summary + suggested reply generated on demand (or eagerly on creation)
3. **Agent reply** → `POST /tickets/:id/reply` → save reply + send outbound email via email provider

## Domain Rules

- Only admins can create/edit/delete users.
- Agents can view and update ticket status and respond to tickets.
- Ticket categories: General Question, Technical Question, Refund Request.
- Ticket statuses: Open → Resolved → Closed.

## Environment Variables (expected)

```
DATABASE_URL          # PostgreSQL connection string
SESSION_SECRET        # Express session secret
ANTHROPIC_API_KEY     # Claude API key
SENDGRID_API_KEY      # or MAILGUN_API_KEY
EMAIL_WEBHOOK_SECRET  # HMAC secret to verify inbound webhook payloads
```
