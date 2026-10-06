import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const findFirstMock = mock()
const createTicketMock = mock()
const createReplyMock = mock()
const sendMock = mock()
const createQueueMock = mock()
const workMock = mock()
const getAiAgentIdMock = mock()

mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findFirst: findFirstMock, create: createTicketMock },
    ticketReply: { create: createReplyMock },
  },
}))
// Mocking the shared leaf dependency (boss) instead of the sibling service modules
// (classify-ticket/resolve-ticket) lets those modules' real enqueue* functions run, so other
// test files that import them for real aren't handed a stub missing their other exports —
// mock.module() is process-global in bun:test and isn't undone until this file's tests finish.
mock.module('../lib/boss', () => ({
  boss: { send: sendMock, createQueue: createQueueMock, work: workMock },
}))
mock.module('../lib/ai-agent', () => ({ getAiAgentId: getAiAgentIdMock }))
afterAll(() => {
  mock.restore()
})

const { webhooksRouter } = await import('./webhooks')
const { CLASSIFY_TICKET_QUEUE } = await import('../services/classify-ticket')
const { AUTO_RESOLVE_TICKET_QUEUE } = await import('../services/resolve-ticket')

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
  sendMock.mockReset()
  sendMock.mockResolvedValue(undefined)
  createQueueMock.mockReset()
  workMock.mockReset()
  getAiAgentIdMock.mockReset()
  getAiAgentIdMock.mockResolvedValue('ai-user-1')

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

    const res = await postWebhook(PAYLOAD)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ type: 'ticket', id: 42, status: 'new' })
    expect(createTicketMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assignedToId: 'ai-user-1' }) }),
    )
    expect(sendMock).toHaveBeenCalledWith(CLASSIFY_TICKET_QUEUE, { ticketId: 42 })
    expect(sendMock).toHaveBeenCalledWith(AUTO_RESOLVE_TICKET_QUEUE, { ticketId: 42 })
  })

  it('threads onto an existing new/processing/open ticket instead of creating a new one', async () => {
    findFirstMock.mockResolvedValueOnce({ id: 7 })
    createReplyMock.mockResolvedValueOnce({ id: 99 })

    const res = await postWebhook(PAYLOAD)

    expect(res.status).toBe(201)
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['new', 'processing', 'open'] } }) }),
    )
    expect(sendMock).not.toHaveBeenCalled()
  })
})

function postCloudMailinWebhook(body: unknown) {
  return fetch(`${baseUrl}/api/webhooks/email/cloudmailin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(body),
  })
}

const CLOUDMAILIN_PAYLOAD = {
  envelope: { from: 'customer@example.com' },
  headers: {
    from: 'Alice Customer <customer@example.com>',
    subject: 'Cannot log in',
    message_id: '<4F145791.8040802@example.com>',
  },
  plain: "I can't log in to my account.",
  html: '<p>I can&#39;t log in to my account.</p>',
}

describe('POST /api/webhooks/email/cloudmailin', () => {
  it('maps CloudMailin normalized JSON into a new ticket', async () => {
    findFirstMock.mockResolvedValueOnce(null)
    createTicketMock.mockResolvedValueOnce({ id: 43, status: 'new' })

    const res = await postCloudMailinWebhook(CLOUDMAILIN_PAYLOAD)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ type: 'ticket', id: 43, status: 'new' })
    expect(createTicketMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromEmail: 'customer@example.com',
          fromName: 'Alice Customer',
          subject: 'Cannot log in',
          body: "I can't log in to my account.",
          messageId: '<4F145791.8040802@example.com>',
        }),
      }),
    )
  })

  it('rejects a payload with no extractable body', async () => {
    const res = await postCloudMailinWebhook({ envelope: { from: 'customer@example.com' }, headers: {} })

    expect(res.status).toBe(400)
    expect(createTicketMock).not.toHaveBeenCalled()
  })
})
