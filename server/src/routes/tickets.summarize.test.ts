import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const generateTextMock = mock()
const openaiMock = mock((modelId: string) => ({ modelId }))
const findUniqueMock = mock()
const findManyMock = mock()

mock.module('ai', () => ({ generateText: generateTextMock }))
mock.module('@ai-sdk/openai', () => ({ openai: openaiMock }))
mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: findUniqueMock },
    ticketReply: { findMany: findManyMock },
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

const TICKET = {
  subject: "Audit log shows actions from an IP I don't recognise",
  body: 'I checked the audit log and see export actions from an IP that is not ours.',
  fromName: 'Alice Customer',
}

const REPLIES = [
  {
    senderType: 'agent',
    body: 'Thanks for flagging this, we are looking into it.',
    author: { name: 'Bob Agent' },
  },
  {
    senderType: 'customer',
    body: 'Any update?',
    author: null,
  },
]

let server: Server
let baseUrl: string

beforeEach(async () => {
  generateTextMock.mockReset()
  openaiMock.mockClear()
  findUniqueMock.mockReset()
  findManyMock.mockReset()

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

function summarize(id: string | number) {
  return fetch(`${baseUrl}/api/tickets/${id}/summarize`, { method: 'POST' })
}

describe('POST /api/tickets/:id/summarize', () => {
  it('returns 400 for a non-numeric ticket id and never calls the AI model', async () => {
    const res = await summarize('abc')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid ticket ID' })
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the ticket does not exist and never calls the AI model', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    const res = await summarize(999)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Ticket not found' })
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns the summary text produced by the AI model', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    findManyMock.mockResolvedValueOnce(REPLIES)
    generateTextMock.mockResolvedValueOnce({ text: 'Customer reported a suspicious login; agent is investigating.' })

    const res = await summarize(1)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      summary: 'Customer reported a suspicious login; agent is investigating.',
    })
  })

  it('calls generateText with the ticket context and conversation history', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    findManyMock.mockResolvedValueOnce(REPLIES)
    generateTextMock.mockResolvedValueOnce({ text: 'summary' })

    await summarize(1)

    expect(openaiMock).toHaveBeenCalledWith('gpt-5-nano-2025-08-07')
    expect(generateTextMock).toHaveBeenCalledTimes(1)

    const call = generateTextMock.mock.calls[0][0] as any
    expect(call.prompt).toContain(TICKET.subject)
    expect(call.prompt).toContain(TICKET.body)
    expect(call.prompt).toContain('Thanks for flagging this, we are looking into it.')
    expect(call.prompt).toContain('Any update?')
  })

  it('regenerates a fresh summary on every call instead of reusing a cached one', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    findManyMock.mockResolvedValueOnce(REPLIES)
    generateTextMock.mockResolvedValueOnce({ text: 'First summary.' })
    await summarize(1)

    findUniqueMock.mockResolvedValueOnce(TICKET)
    findManyMock.mockResolvedValueOnce(REPLIES)
    generateTextMock.mockResolvedValueOnce({ text: 'Second summary.' })
    const res = await summarize(1)

    expect(generateTextMock).toHaveBeenCalledTimes(2)
    expect(await res.json()).toEqual({ summary: 'Second summary.' })
  })

  it('instructs the model to treat ticket content as untrusted context, not instructions', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    findManyMock.mockResolvedValueOnce(REPLIES)
    generateTextMock.mockResolvedValueOnce({ text: 'summary' })

    await summarize(1)

    const call = generateTextMock.mock.calls[0][0] as any
    expect(call.system.toLowerCase()).toContain('never instructions')
  })

  it('propagates an AI provider failure as a server error instead of a fabricated summary', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    findManyMock.mockResolvedValueOnce(REPLIES)
    generateTextMock.mockRejectedValueOnce(new Error('provider unavailable'))

    const res = await summarize(1)

    expect(res.status).toBeGreaterThanOrEqual(500)
  })
})
