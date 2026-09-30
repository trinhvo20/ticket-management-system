import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateObjectMock = mock()
const openaiMock = mock((modelId: string) => ({ modelId }))
const findUniqueMock = mock()
const updateMock = mock()
const sendMock = mock()
const createQueueMock = mock()
const workMock = mock()

mock.module('ai', () => ({ generateObject: generateObjectMock }))
mock.module('@ai-sdk/openai', () => ({ openai: openaiMock }))
mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: findUniqueMock, update: updateMock },
  },
}))
mock.module('../lib/boss', () => ({
  boss: { send: sendMock, createQueue: createQueueMock, work: workMock },
}))

const { classifyTicket, enqueueClassifyTicket, registerClassifyTicketWorker, CLASSIFY_TICKET_QUEUE } = await import(
  './classify-ticket'
)

const TICKET = {
  subject: 'I want my money back',
  body: 'Please refund my last payment, the product did not work as advertised.',
}

beforeEach(() => {
  generateObjectMock.mockReset()
  openaiMock.mockClear()
  findUniqueMock.mockReset()
  updateMock.mockReset()
  sendMock.mockReset()
  createQueueMock.mockReset()
  workMock.mockReset()
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

  it('propagates AI provider failures so the pg-boss worker can retry the job', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockRejectedValueOnce(new Error('provider unavailable'))

    await expect(classifyTicket(1)).rejects.toThrow('provider unavailable')
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('propagates DB update failures so the pg-boss worker can retry the job', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { category: 'refund_request' } })
    updateMock.mockRejectedValueOnce(new Error('db unavailable'))

    await expect(classifyTicket(1)).rejects.toThrow('db unavailable')
  })
})

describe('enqueueClassifyTicket', () => {
  it('sends a job to the classify-ticket queue with the ticket id', async () => {
    sendMock.mockResolvedValueOnce('job-1')

    await enqueueClassifyTicket(42)

    expect(sendMock).toHaveBeenCalledWith(CLASSIFY_TICKET_QUEUE, { ticketId: 42 })
  })
})

describe('registerClassifyTicketWorker', () => {
  it('creates the queue with a retry policy and registers a worker that classifies the job ticket', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { category: 'refund_request' } })

    await registerClassifyTicketWorker()

    expect(createQueueMock).toHaveBeenCalledWith(CLASSIFY_TICKET_QUEUE, { retryLimit: 3, retryBackoff: true })
    expect(workMock).toHaveBeenCalledWith(CLASSIFY_TICKET_QUEUE, expect.any(Function))

    const handler = workMock.mock.calls[0][1] as (jobs: { data: { ticketId: number } }[]) => Promise<void>
    await handler([{ data: { ticketId: 7 } }])

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { id: 7 }, select: { subject: true, body: true } })
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 7 }, data: { category: 'refund_request' } })
  })
})
