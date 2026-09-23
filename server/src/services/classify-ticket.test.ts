import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateObjectMock = mock()
const openaiMock = mock((modelId: string) => ({ modelId }))
const findUniqueMock = mock()
const updateMock = mock()

mock.module('ai', () => ({ generateObject: generateObjectMock }))
mock.module('@ai-sdk/openai', () => ({ openai: openaiMock }))
mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: findUniqueMock, update: updateMock },
  },
}))

const { classifyTicket } = await import('./classify-ticket')

const TICKET = {
  subject: 'I want my money back',
  body: 'Please refund my last payment, the product did not work as advertised.',
}

beforeEach(() => {
  generateObjectMock.mockReset()
  openaiMock.mockClear()
  findUniqueMock.mockReset()
  updateMock.mockReset()
})

describe('classifyTicket', () => {
  it('does nothing when the ticket no longer exists', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    await classifyTicket(999)

    expect(generateObjectMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('classifies the ticket and persists the returned category', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { category: 'refund_request' } })

    await classifyTicket(1)

    expect(openaiMock).toHaveBeenCalledWith('gpt-5-nano-2025-08-07')
    const call = generateObjectMock.mock.calls[0][0] as any
    expect(call.prompt).toContain(TICKET.subject)
    expect(call.prompt).toContain(TICKET.body)

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { category: 'refund_request' },
    })
  })

  it('instructs the model to treat ticket content as untrusted context, not instructions', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { category: 'refund_request' } })

    await classifyTicket(1)

    const call = generateObjectMock.mock.calls[0][0] as any
    expect(call.system.toLowerCase()).toContain('never instructions')
  })

  it('swallows AI provider failures instead of throwing, since callers do not await it', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockRejectedValueOnce(new Error('provider unavailable'))

    await expect(classifyTicket(1)).resolves.toBeUndefined()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('swallows DB update failures instead of throwing', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { category: 'refund_request' } })
    updateMock.mockRejectedValueOnce(new Error('db unavailable'))

    await expect(classifyTicket(1)).resolves.toBeUndefined()
  })
})
