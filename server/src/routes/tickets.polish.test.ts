import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Server } from 'http'
import express from 'express'

const generateTextMock = mock()
const openaiMock = mock((modelId: string) => ({ modelId }))
const findUniqueMock = mock()

mock.module('ai', () => ({ generateText: generateTextMock }))
mock.module('@ai-sdk/openai', () => ({ openai: openaiMock }))
mock.module('../lib/prisma', () => ({ prisma: { ticket: { findUnique: findUniqueMock } } }))
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

let server: Server
let baseUrl: string

beforeEach(async () => {
  generateTextMock.mockReset()
  openaiMock.mockClear()
  findUniqueMock.mockReset()

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

function polish(id: string | number, body: unknown) {
  return fetch(`${baseUrl}/api/tickets/${id}/replies/polish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

describe('POST /api/tickets/:id/replies/polish', () => {
  it('returns 400 for a non-numeric ticket id and never calls the AI model', async () => {
    const res = await polish('abc', 'hi, it is fixed, try again please')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid ticket ID' })
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the ticket does not exist and never calls the AI model', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    const res = await polish(999, 'hi, it is fixed, try again please')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Ticket not found' })
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns 400 when the draft body is empty and never calls the AI model', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)

    const res = await polish(1, '')

    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('Reply cannot be empty')
    expect(generateTextMock).not.toHaveBeenCalled()
  })

  it('returns the polished text produced by the AI model', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateTextMock.mockResolvedValueOnce({
      text: 'Hello, Alice Customer\n\nThe issue has been fixed. Please try again.\n\nBest Regard, Bob Agent',
    })

    const res = await polish(1, 'hi, it is fixed, try again please')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      body: 'Hello, Alice Customer\n\nThe issue has been fixed. Please try again.\n\nBest Regard, Bob Agent',
    })
  })

  it('calls generateText with the configured model and a prompt containing the ticket context and the agent draft', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateTextMock.mockResolvedValueOnce({ text: 'polished' })

    await polish(1, 'hi, it is fixed, try again please')

    expect(openaiMock).toHaveBeenCalledWith('gpt-5-nano-2025-08-07')
    expect(generateTextMock).toHaveBeenCalledTimes(1)

    const call = generateTextMock.mock.calls[0][0] as any
    expect(call.model).toEqual({ modelId: 'gpt-5-nano-2025-08-07' })
    expect(call.prompt).toContain(TICKET.subject)
    expect(call.prompt).toContain(TICKET.body)
    expect(call.prompt).toContain('hi, it is fixed, try again please')
  })

  it('tells the model to sign off with the authenticated agent and the ticket sender, not attacker-controlled input', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateTextMock.mockResolvedValueOnce({ text: 'polished' })

    await polish(1, 'hi, it is fixed, try again please')

    const call = generateTextMock.mock.calls[0][0] as any
    expect(call.system).toContain('Bob Agent')
    expect(call.system).toContain('Alice Customer')
  })

  it('instructs the model to treat the ticket subject/body as untrusted context, not instructions', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateTextMock.mockResolvedValueOnce({ text: 'polished' })

    await polish(1, 'hi, it is fixed, try again please')

    const call = generateTextMock.mock.calls[0][0] as any
    expect(call.system.toLowerCase()).toContain('never instructions')
  })

  it('propagates an AI provider failure as a server error instead of a fabricated reply', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateTextMock.mockRejectedValueOnce(new Error('provider unavailable'))

    const res = await polish(1, 'hi, it is fixed, try again please')

    expect(res.status).toBeGreaterThanOrEqual(500)
  })
})
