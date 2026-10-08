# AI Support Ticket System

A support desk app where **customer emails become tickets**, and **AI helps answer them**.

When a customer sends an email, the app turns it into a ticket. AI sorts it into a category, and if the answer is in the company's knowledge base, AI replies to the customer by itself. Harder tickets go to a human agent, who gets an AI summary and AI help writing the reply. Replies go back to the customer as normal emails, in the same email thread.

**Live demo:** https://ticket-management-system-production-5f97.up.railway.app (login required -- maybe expired due to Railway free trial)

<!-- Add a screenshot here, e.g. ![Dashboard](docs/dashboard.png) -->

---

## The problem

A support team gets hundreds of emails a day. Agents read each one, decide what it's about, and type a reply, often the same answer again and again. It's slow, and customers wait.

## What this app does

- **Email → ticket:** emails sent to the support address show up as tickets automatically. Customer replies are added to the same ticket.
- **AI sorting:** each new ticket is labeled as a *General question*, *Technical question*, or *Refund request*.
- **AI auto-reply:** if the knowledge base fully answers the question, the AI replies and marks the ticket resolved. If not, it hands the ticket to a human. It is told to use only facts from the knowledge base.
- **AI helpers for agents:** a one-click **summary** of the ticket, and **polish** to clean up a reply before sending.
- **Email replies:** agent and AI replies are emailed to the customer and land in the same thread in their inbox.
- **Ticket list:** search, filter (status, category, agent), sort, and pages.
- **Dashboard:** ticket counts and a chart of tickets per day.
- **Users and roles:** an **admin** manages agent accounts; **agents** work on tickets. There's no public sign-up.

## How it works

```
Customer email
   │
   ▼
CloudMailin ──► POST /api/webhooks/email ──► Ticket saved in Postgres
                                                 │
                                                 ▼
                                   Background jobs (pg-boss queue)
                                   1. AI classifies the ticket
                                   2. AI tries to answer it from the knowledge base
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
                 AI can answer                                 AI can't answer
                 → reply saved + emailed (SendGrid)            → agent handles it in the app
                 → ticket resolved                              (AI summary + reply polish)
```

AI work runs in **background jobs**, so the email webhook answers right away, and failed jobs are retried automatically.

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Recharts |
| Backend | Bun, Express 5, TypeScript, Better Auth (sessions) |
| Database | PostgreSQL, Prisma ORM |
| Background jobs | pg-boss (job queue stored in Postgres) |
| AI | OpenAI through the Vercel AI SDK |
| Email | CloudMailin (incoming), SendGrid (outgoing) |
| Shared code | `@ticket/core`: Zod schemas and types used by both frontend and backend |
| Testing | Vitest + React Testing Library, Bun test, Playwright (end-to-end) |
| Monitoring | Sentry (frontend and backend errors) |
| Deployment | Docker, Railway |

## Highlights

- **One set of validation rules for frontend and backend.** Zod schemas live in a shared package, so forms and API checks always match.
- **AI with guardrails.** The AI returns structured data (`canResolve` + `replyBody`) instead of free text, and may only use facts from the knowledge base. If it's unsure, a human takes over.
- **Reliable background work.** Slow AI calls and email sends are queued jobs with retries, so a slow or failed API call doesn't break a request.
- **Secure by default.** Session-based login, admin-only routes, a secret token on the email webhook (checked with a timing-safe compare), rate limiting, and request validation on every route.
- **Real email threading.** Replies set `In-Reply-To` / `References` headers, so the conversation stays in one thread in the customer's inbox.
- **Well tested.** 128 frontend tests, 70 backend tests, and Playwright end-to-end tests for login, tickets, users, and the email webhook.
- **Simple deployment.** One Docker image runs the whole app. The server serves both the API and the React site from one domain.

## Project structure

```
core/     shared Zod schemas and types (@ticket/core)
client/   React app (pages, components, API calls)
server/   Express API, Prisma schema and migrations, background jobs
e2e/      Playwright end-to-end tests
```

## Run it locally

You need [Bun](https://bun.sh) and PostgreSQL.

```bash
# 1. Install packages
bun install

# 2. Add environment files, then fill in the values
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Create the database tables and the admin user
cd server
bunx prisma migrate dev
bun db:seed
cd ..

# 4. Start frontend + backend
bun dev
```

Open http://localhost:5173 and log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

To receive real emails locally, expose the server with `ngrok http 3001` and set CloudMailin's target to `https://<ngrok-url>/api/webhooks/email/cloudmailin`.

### Tests

```bash
bun run test:unit        # frontend tests
cd server && bun test    # backend tests
bun test:e2e             # end-to-end tests (uses a separate test database)
```

## Deployment (Railway + Docker)

The whole app runs as **one Docker container**. The Express server serves the API (`/api/*`) and the built React site from the same domain.

- [`Dockerfile`](Dockerfile): builds the React site, installs only the server's production packages, and runs the server as a non-root user on a small Bun image.
- [`railway.json`](railway.json): tells Railway to use the Dockerfile, run database migrations before each deploy, and check `/health`.

### Setup steps

1. In Railway, create a project from this GitHub repo and add a **PostgreSQL** database.
2. On the app service, go to **Settings → Networking → Generate Domain**.
3. Add these variables to the app service:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (use **Add Reference** so it links to the database) |
   | `BETTER_AUTH_SECRET` | a long random string (`openssl rand -base64 32`) |
   | `SERVER_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
   | `CLIENT_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
   | `EMAIL_WEBHOOK_SECRET` | a random string, also used in CloudMailin's `Authorization: Bearer …` header |
   | `OPENAI_API_KEY` | your OpenAI key |
   | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` | your SendGrid settings |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first admin account (used by the seed script) |
   | `SENTRY_DSN`, `VITE_SENTRY_DSN` | optional, for error tracking. The `VITE_` one is baked into the build, so redeploy after changing it |

   Leave `VITE_SERVER_URL` unset: the site then calls its own domain.
4. Deploy. Then create the admin user once:

   ```bash
   railway link
   railway ssh
   bun run db:seed
   ```
5. In CloudMailin, set the target URL to `https://<your-domain>/api/webhooks/email/cloudmailin`, with the header `Authorization: Bearer <EMAIL_WEBHOOK_SECRET>`.

### Run the production image on your computer

```bash
docker build -t ticket-app .
docker run --rm -p 3080:3001 --env-file server/.env \
  -e DATABASE_URL=postgresql://<user>:<pass>@host.docker.internal:5432/<db> \
  -e SERVER_URL=http://localhost:3080 -e CLIENT_URL=http://localhost:3080 \
  ticket-app
# open http://localhost:3080
```

### App screenshots

<img width="3830" height="1935" alt="image" src="https://github.com/user-attachments/assets/e2abc8a7-c298-43f7-b007-2e167329f8fb" />

<img width="3837" height="1745" alt="image" src="https://github.com/user-attachments/assets/7208131e-3089-4535-83a4-04137d9abe8b" />

<img width="3827" height="1675" alt="image" src="https://github.com/user-attachments/assets/a0484f49-05ed-4617-aabc-95ec615de91d" />

<img width="3827" height="1975" alt="image" src="https://github.com/user-attachments/assets/38c94e13-c124-4f24-8a61-5514ebb1361e" />

<img width="3830" height="1750" alt="image" src="https://github.com/user-attachments/assets/0b6d4d49-2af7-47eb-a155-994293142004" />

<img width="3830" height="1747" alt="image" src="https://github.com/user-attachments/assets/65c10381-7a5a-4010-b7d4-e022aa8a28fc" />

---

Built with the help of [Claude Code](https://claude.com/claude-code).


