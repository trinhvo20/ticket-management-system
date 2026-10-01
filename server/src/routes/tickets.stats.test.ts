import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const countMock = mock()
const findManyMock = mock()
const transactionMock = mock((ops: unknown[]) => Promise.all(ops))
const getAiAgentIdMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { count: countMock, findMany: findManyMock },
    $transaction: transactionMock,
  },
}))
mock.module('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'agent-1', name: 'Bob Agent' }
    next()
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}))
mock.module('../lib/ai-agent', () => ({ getAiAgentId: getAiAgentIdMock }))

const { ticketsRouter } = await import('./tickets')

let server: Server
let baseUrl: string

beforeEach(async () => {
  countMock.mockReset()
  findManyMock.mockReset()
  transactionMock.mockClear()
  getAiAgentIdMock.mockReset()
  getAiAgentIdMock.mockResolvedValue('ai-user-1')

  const app = express()
  app.use(express.json())
  app.use('/api/tickets', ticketsRouter)

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

function getStats() {
  return fetch(`${baseUrl}/api/tickets/stats`)
}

describe('GET /api/tickets/stats', () => {
  it('returns totals, AI-resolved count/percentage, and average resolution time', async () => {
    countMock.mockResolvedValueOnce(10) // total
    countMock.mockResolvedValueOnce(3) // open
    countMock.mockResolvedValueOnce(4) // resolvedByAi
    findManyMock.mockResolvedValueOnce([
      { createdAt: new Date('2026-01-01T00:00:00Z'), resolvedAt: new Date('2026-01-01T01:00:00Z') },
      { createdAt: new Date('2026-01-01T00:00:00Z'), resolvedAt: new Date('2026-01-01T03:00:00Z') },
    ]) // resolvedTickets
    findManyMock.mockResolvedValueOnce([]) // recentTickets (daily counts)

    const res = await getStats()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      total: 10,
      open: 3,
      resolvedByAi: 4,
      pctResolvedByAi: 40,
      avgResolutionTimeMs: 2 * 60 * 60 * 1000,
    })
    expect(countMock).toHaveBeenNthCalledWith(2, { where: { status: 'open' } })
    expect(countMock).toHaveBeenNthCalledWith(3, { where: { status: 'resolved', assignedToId: 'ai-user-1' } })
  })

  it('returns null average resolution time when no ticket has been resolved yet', async () => {
    countMock.mockResolvedValueOnce(0)
    countMock.mockResolvedValueOnce(0)
    countMock.mockResolvedValueOnce(0)
    findManyMock.mockResolvedValueOnce([])
    findManyMock.mockResolvedValueOnce([])

    const res = await getStats()

    expect(await res.json()).toMatchObject({
      total: 0,
      open: 0,
      resolvedByAi: 0,
      pctResolvedByAi: 0,
      avgResolutionTimeMs: null,
    })
  })

  it('returns a 30-day zero-filled daily ticket count ending today, with real counts folded in', async () => {
    countMock.mockResolvedValueOnce(2)
    countMock.mockResolvedValueOnce(2)
    countMock.mockResolvedValueOnce(0)
    findManyMock.mockResolvedValueOnce([])

    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)
    findManyMock.mockResolvedValueOnce([{ createdAt: today }, { createdAt: today }])

    const res = await getStats()

    const { dailyCounts } = (await res.json()) as { dailyCounts: { date: string; count: number }[] }
    expect(dailyCounts).toHaveLength(30)
    expect(dailyCounts[29]).toEqual({ date: todayKey, count: 2 })
    expect(dailyCounts.slice(0, 29).every((d) => d.count === 0)).toBe(true)
  })
})
