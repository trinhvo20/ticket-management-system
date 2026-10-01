import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const findManyMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: { user: { findMany: findManyMock } },
}))
mock.module('../lib/auth', () => ({ auth: {} }))
mock.module('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'agent-1', name: 'Bob Agent' }
    next()
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}))

const { usersRouter } = await import('./users')
const { AI_AGENT_EMAIL } = await import('../lib/ai-agent')

let server: Server
let baseUrl: string

beforeEach(async () => {
  findManyMock.mockReset()
  findManyMock.mockResolvedValue([])

  const app = express()
  app.use(express.json())
  app.use('/api/users', usersRouter)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  baseUrl = `http://localhost:${port}`
})

afterEach(() => {
  server.close()
})

describe('GET /api/users/agents', () => {
  it('excludes the AI agent from the assignment dropdown', async () => {
    await fetch(`${baseUrl}/api/users/agents`)

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: { not: AI_AGENT_EMAIL } }),
      }),
    )
  })
})
