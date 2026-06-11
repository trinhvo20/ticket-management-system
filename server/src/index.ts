import express from 'express'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth'
import { requireAuth } from './middleware/auth'
import { usersRouter } from './routes/users'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }))

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
