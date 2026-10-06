import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const queryRawMock = mock()
const getAiAgentIdMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: { $queryRaw: queryRawMock },
}))
mock.module('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'agent-1', name: 'Bob Agent' }
    next()
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}))
mock.module('../lib/ai-agent', () => ({ getAiAgentId: getAiAgentIdMock }))
afterAll(() => {
  mock.restore()
})

const { ticketsRouter } = await import('./tickets')

let server: Server
let baseUrl: string

beforeEach(async () => {
  queryRawMock.mockReset()
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

const SAMPLE_STATS = {
  total: 10,
  open: 3,
  resolvedByAi: 4,
  pctResolvedByAi: 40,
  avgResolutionTimeMs: 2 * 60 * 60 * 1000,
  dailyCounts: [{ date: '2026-01-01', count: 2 }],
}

describe('GET /api/tickets/stats', () => {
  it('calls the get_dashboard_stats Postgres function with the AI agent id and a 30-day window', async () => {
    queryRawMock.mockResolvedValueOnce([{ stats: SAMPLE_STATS }])

    const res = await getStats()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(SAMPLE_STATS)

    expect(queryRawMock).toHaveBeenCalledTimes(1)
    const [strings, ...values] = queryRawMock.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
    expect(strings.join('?')).toContain('get_dashboard_stats')
    expect(values).toEqual(['ai-user-1', 30])
  })

  it('returns whatever shape the stored function produces as-is', async () => {
    const emptyStats = {
      total: 0,
      open: 0,
      resolvedByAi: 0,
      pctResolvedByAi: 0,
      avgResolutionTimeMs: null,
      dailyCounts: [],
    }
    queryRawMock.mockResolvedValueOnce([{ stats: emptyStats }])

    const res = await getStats()

    expect(await res.json()).toEqual(emptyStats)
  })
})
