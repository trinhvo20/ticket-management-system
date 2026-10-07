import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const findUniqueMock = mock()
const updateMock = mock()
const sessionDeleteManyMock = mock()
const ticketUpdateManyMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: findUniqueMock, update: updateMock },
    session: { deleteMany: sessionDeleteManyMock },
    ticket: { updateMany: ticketUpdateManyMock },
  },
}))
mock.module('../lib/auth', () => ({ auth: {} }))
mock.module('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-1', name: 'Admin', role: 'admin' }
    next()
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}))
afterAll(() => {
  mock.restore()
})

const { usersRouter } = await import('./users')
const { AI_AGENT_EMAIL } = await import('../lib/ai-agent')

const AI_USER = { id: 'ai-1', email: AI_AGENT_EMAIL, role: 'agent', deletedAt: null }
const AGENT_USER = { id: 'agent-2', email: 'jane@example.com', role: 'agent', deletedAt: null }

let server: Server
let baseUrl: string

beforeEach(async () => {
  findUniqueMock.mockReset()
  updateMock.mockReset()
  sessionDeleteManyMock.mockReset()
  ticketUpdateManyMock.mockReset()

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

describe('PATCH /api/users/:id', () => {
  it('returns 403 and does not update the AI agent', async () => {
    findUniqueMock.mockResolvedValue({ email: AI_AGENT_EMAIL })

    const res = await fetch(`${baseUrl}/api/users/ai-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed', email: 'new@example.com', role: 'agent' }),
    })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'The AI agent is a system user and cannot be modified' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('still updates regular users', async () => {
    findUniqueMock.mockImplementation(({ where }: any) =>
      where.id === 'agent-2' ? { ...AGENT_USER, name: 'Jane' } : null,
    )
    updateMock.mockResolvedValue({})

    const res = await fetch(`${baseUrl}/api/users/agent-2`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Jane Doe', email: 'jane@example.com', role: 'agent' }),
    })

    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalled()
  })
})

describe('DELETE /api/users/:id', () => {
  it('returns 403 and does not delete the AI agent', async () => {
    findUniqueMock.mockResolvedValue(AI_USER)

    const res = await fetch(`${baseUrl}/api/users/ai-1`, { method: 'DELETE' })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'The AI agent is a system user and cannot be modified' })
    expect(updateMock).not.toHaveBeenCalled()
    expect(sessionDeleteManyMock).not.toHaveBeenCalled()
    expect(ticketUpdateManyMock).not.toHaveBeenCalled()
  })

  it('still deletes regular agents', async () => {
    findUniqueMock.mockResolvedValue(AGENT_USER)
    updateMock.mockResolvedValue({})

    const res = await fetch(`${baseUrl}/api/users/agent-2`, { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(updateMock).toHaveBeenCalled()
  })
})
