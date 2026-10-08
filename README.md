# ticket-management-system
Built with Claude AI

## Deploying to Railway (Docker)

The frontend and backend deploy together as **one Railway service built from one Docker image**. The Express server (run by Bun) serves both `/api/*` and the built React client from the same origin. There's no separate frontend service, no cross-origin CORS, and no cross-site cookies.

- [`Dockerfile`](Dockerfile): multi-stage build. `deps` installs all workspaces, `build` runs `vite build` → `client/dist`, `prod-deps` installs the server's production deps and runs `prisma generate`. `runtime` (`oven/bun:*-slim`, non-root) copies `core/src`, `server/` and `client/dist` into `/app` and runs `bun src/index.ts` from `/app/server`.
- [`railway.json`](railway.json): `DOCKERFILE` builder, pre-deploy `bun run db:deploy` (`prisma migrate deploy`), health check `GET /health`.

### First-time setup

1. Create a Railway project → **Deploy from GitHub repo** (this repo, root directory `/`).
2. Add a **PostgreSQL** database to the project.
3. On the app service, **Settings → Networking → Generate Domain**.
4. Set the service variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `BETTER_AUTH_SECRET` | random string, e.g. `openssl rand -base64 32` |
   | `SERVER_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
   | `CLIENT_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` (same origin as the server) |
   | `EMAIL_WEBHOOK_SECRET` | random string (also used in CloudMailin's `Authorization: Bearer` header) |
   | `OPENAI_API_KEY` | OpenAI key |
   | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` | SendGrid settings |
   | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | optional, server-side Sentry |
   | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT` | optional, client-side Sentry. These are Docker **build args** baked into the bundle, so redeploy after changing them |

   `NODE_ENV=production` is set by the image. Do **not** set `VITE_SERVER_URL`: when it's unset the client calls its own origin.
5. Deploy. Then seed the admin user once (idempotent):

   ```bash
   railway ssh --service <app-service>
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... bun prisma/seed.ts
   ```
6. Point CloudMailin's target URL at `https://<your-domain>/api/webhooks/email/cloudmailin` (this replaces the ngrok URL used in development).

### Run the production image locally

```bash
docker build -t ticket-app .
docker run --rm -p 3001:3001 --env-file server/.env \
  -e DATABASE_URL=postgresql://<user>:<pass>@host.docker.internal:5432/TicketManagementSystem \
  -e CLIENT_URL=http://localhost:3001 ticket-app
# → http://localhost:3001
```
