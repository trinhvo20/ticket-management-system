import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const findManyMock = mock()
const countMock = mock()
const transactionMock = mock((ops: unknown[]) => Promise.all(ops))

mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findMany: findManyMock, count: countMock },
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

const { ticketsRouter } = await import('./tickets')

let server: Server
let baseUrl: string

beforeEach(async () => {
  findManyMock.mockReset()
  findManyMock.mockResolvedValue([])
  countMock.mockReset()
  countMock.mockResolvedValue(0)
  transactionMock.mockClear()

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

function listTickets(query = '') {
  return fetch(`${baseUrl}/api/tickets${query}`)
}

describe('GET /api/tickets', () => {
  it('excludes new and processing tickets when no status filter is given', async () => {
    await listTickets()

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { notIn: ['new', 'processing'] } } }),
    )
  })

  it('returns only the explicitly requested status, including new or processing', async () => {
    await listTickets('?status=processing')

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'processing' } }))
  })
})
