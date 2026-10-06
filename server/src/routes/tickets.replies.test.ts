import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const findUniqueMock = mock()
const createMock = mock()
const sendMock = mock()
const createQueueMock = mock()
const workMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: { ticket: { findUnique: findUniqueMock }, ticketReply: { create: createMock } },
}))
mock.module('../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'agent-1', name: 'Bob Agent' }
    next()
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}))
// Mocking the shared leaf dependency (boss) instead of the sibling ../services/send-reply-email
// lets that module's real enqueueSendReplyEmail run, so send-reply-email.test.ts (which imports
// it for real) isn't handed a stub missing its other exports — mock.module() is process-global
// in bun:test and isn't undone until this file's tests finish.
mock.module('../lib/boss', () => ({
  boss: { send: sendMock, createQueue: createQueueMock, work: workMock },
}))
afterAll(() => {
  mock.restore()
})

const { ticketsRouter } = await import('./tickets')
const { SEND_REPLY_EMAIL_QUEUE } = await import('../services/send-reply-email')

let server: Server
let baseUrl: string

beforeEach(async () => {
  findUniqueMock.mockReset()
  createMock.mockReset()
  sendMock.mockReset()
  sendMock.mockResolvedValue(undefined)
  createQueueMock.mockReset()
  workMock.mockReset()

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

function postReply(id: string | number, body: unknown) {
  return fetch(`${baseUrl}/api/tickets/${id}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

describe('POST /api/tickets/:id/replies', () => {
  it('creates the reply and enqueues the outbound email', async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 })
    createMock.mockResolvedValueOnce({ id: 77, body: 'Thanks for reaching out.', author: { id: 'agent-1', name: 'Bob Agent' } })

    const res = await postReply(1, 'Thanks for reaching out.')

    expect(res.status).toBe(201)
    expect(sendMock).toHaveBeenCalledWith(SEND_REPLY_EMAIL_QUEUE, { replyId: 77 })
  })

  it('does not enqueue an email when the ticket does not exist', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    const res = await postReply(999, 'Thanks for reaching out.')

    expect(res.status).toBe(404)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('does not enqueue an email when the body fails validation', async () => {
    findUniqueMock.mockResolvedValueOnce({ id: 1 })

    const res = await postReply(1, '')

    expect(res.status).toBe(400)
    expect(createMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })
})
