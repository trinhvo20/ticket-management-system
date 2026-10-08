import { Sentry } from './lib/sentry'
import path from 'path'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth'
import { requireAuth } from './middleware/auth'
import { usersRouter } from './routes/users'
import { ticketsRouter } from './routes/tickets'
import { webhooksRouter } from './routes/webhooks'
import { startBoss, stopBoss } from './lib/boss'
import { registerClassifyTicketWorker } from './services/classify-ticket'
import { registerAutoResolveTicketWorker } from './services/resolve-ticket'
import { registerSendReplyEmailWorker } from './services/send-reply-email'

const app = express()
const PORT = process.env.PORT ?? 3001
const isProduction = process.env.NODE_ENV === 'production'
const clientDist = path.resolve(import.meta.dir, '../../client/dist')

// Railway terminates TLS at a proxy — trust its X-Forwarded-* headers
app.set('trust proxy', 1)

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }))

// In production the built client is served from the same origin. Static assets are
// mounted before the rate limiter so page loads don't eat into the API budget.
if (isProduction) {
  app.use(express.static(clientDist, { index: false }))
}

if (isProduction) {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }))
}

app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/me', requireAuth, (req, res) => {
  const { id, name, email, role } = req.user
  res.json({ user: { id, name, email, role } })
})

app.use('/api/users', usersRouter)
app.use('/api/tickets', ticketsRouter)
if (process.env.NODE_ENV !== 'test') {
  const webhookRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false })
  app.use('/api/webhooks/email', webhookRateLimit, webhooksRouter)
} else {
  app.use('/api/webhooks/email', webhooksRouter)
}

if (isProduction) {
  // SPA fallback: any non-API GET returns index.html so client-side routes survive a refresh
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app)
}

await startBoss()
await registerClassifyTicketWorker()
await registerAutoResolveTicketWorker()
await registerSendReplyEmailWorker()

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

async function shutdown() {
  server.close()
  await stopBoss()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
