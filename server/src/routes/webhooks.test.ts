import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const findFirstMock = mock()
const createTicketMock = mock()
const createReplyMock = mock()
const classifyTicketMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findFirst: findFirstMock, create: createTicketMock },
    ticketReply: { create: createReplyMock },
  },
}))
mock.module('../services/classify-ticket', () => ({ classifyTicket: classifyTicketMock }))

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
  classifyTicketMock.mockReset()

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
  it('kicks off classification for a newly created ticket without waiting on it', async () => {
    findFirstMock.mockResolvedValueOnce(null)
    createTicketMock.mockResolvedValueOnce({ id: 42, status: 'open' })
    let resolveClassify: () => void = () => {}
    classifyTicketMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveClassify = resolve
      }),
    )

    const res = await postWebhook(PAYLOAD)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ type: 'ticket', id: 42, status: 'open' })
    expect(classifyTicketMock).toHaveBeenCalledWith(42)
    resolveClassify()
  })

  it('does not classify when the email threads onto an existing open ticket', async () => {
    findFirstMock.mockResolvedValueOnce({ id: 7 })
    createReplyMock.mockResolvedValueOnce({ id: 99 })

    const res = await postWebhook(PAYLOAD)

    expect(res.status).toBe(201)
    expect(classifyTicketMock).not.toHaveBeenCalled()
  })
})
