import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const findFirstMock = mock()
const createTicketMock = mock()
const createReplyMock = mock()
const enqueueClassifyTicketMock = mock()
const enqueueAutoResolveTicketMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findFirst: findFirstMock, create: createTicketMock },
    ticketReply: { create: createReplyMock },
  },
}))
mock.module('../services/classify-ticket', () => ({ enqueueClassifyTicket: enqueueClassifyTicketMock }))
mock.module('../services/resolve-ticket', () => ({ enqueueAutoResolveTicket: enqueueAutoResolveTicketMock }))

const { webhooksRouter } = await import('./webhooks')

const SECRET = 'test-webhook-secret'
const PAYLOAD = {
  from: 'customer@example.com',
  fromName: 'Alice Customer',
  subject: 'Cannot log in',
  body: "I can't log in to my account.",
}

let server: Server
let baseUrl: string

beforeEach(async () => {
  process.env['EMAIL_WEBHOOK_SECRET'] = SECRET
  findFirstMock.mockReset()
  createTicketMock.mockReset()
  createReplyMock.mockReset()
  enqueueClassifyTicketMock.mockReset()
  enqueueAutoResolveTicketMock.mockReset()

  const app = express()
  app.use(express.json())
  app.use('/api/webhooks/email', webhooksRouter)

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

function postWebhook(body: unknown) {
  return fetch(`${baseUrl}/api/webhooks/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/email', () => {
  it('enqueues classification and auto-resolve jobs for a newly created ticket', async () => {
    findFirstMock.mockResolvedValueOnce(null)
    createTicketMock.mockResolvedValueOnce({ id: 42, status: 'new' })
    enqueueClassifyTicketMock.mockResolvedValueOnce(undefined)
    enqueueAutoResolveTicketMock.mockResolvedValueOnce(undefined)

    const res = await postWebhook(PAYLOAD)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ type: 'ticket', id: 42, status: 'new' })
    expect(enqueueClassifyTicketMock).toHaveBeenCalledWith(42)
    expect(enqueueAutoResolveTicketMock).toHaveBeenCalledWith(42)
  })

  it('threads onto an existing new/processing/open ticket instead of creating a new one', async () => {
    findFirstMock.mockResolvedValueOnce({ id: 7 })
    createReplyMock.mockResolvedValueOnce({ id: 99 })

    const res = await postWebhook(PAYLOAD)

    expect(res.status).toBe(201)
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['new', 'processing', 'open'] } }) }),
    )
    expect(enqueueClassifyTicketMock).not.toHaveBeenCalled()
    expect(enqueueAutoResolveTicketMock).not.toHaveBeenCalled()
  })
})
