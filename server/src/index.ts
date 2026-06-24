import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth'
import { requireAuth } from './middleware/auth'
import { usersRouter } from './routes/users'
import { webhooksRouter } from './routes/webhooks'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }))

if (process.env.NODE_ENV === 'production') {
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
const webhookRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false })
app.use('/api/webhooks/email', webhookRateLimit, webhooksRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
