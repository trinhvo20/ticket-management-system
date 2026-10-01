import { beforeEach, describe, expect, it, mock } from 'bun:test'

const generateObjectMock = mock()
const openaiMock = mock((modelId: string) => ({ modelId }))
const findUniqueMock = mock()
const updateManyMock = mock()
const ticketReplyCreateMock = mock()
const transactionMock = mock((ops: unknown[]) => Promise.all(ops))
const sendMock = mock()
const createQueueMock = mock()
const workMock = mock()

mock.module('ai', () => ({ generateObject: generateObjectMock }))
mock.module('@ai-sdk/openai', () => ({ openai: openaiMock }))
mock.module('../lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: findUniqueMock, updateMany: updateManyMock },
    ticketReply: { create: ticketReplyCreateMock },
    $transaction: transactionMock,
  },
}))
mock.module('../lib/boss', () => ({
  boss: { send: sendMock, createQueue: createQueueMock, work: workMock },
}))

const {
  autoResolveTicket,
  enqueueAutoResolveTicket,
  registerAutoResolveTicketWorker,
  AUTO_RESOLVE_TICKET_QUEUE,
} = await import('./resolve-ticket')

const TICKET = {
  subject: 'Forgot my password',
  body: 'I forgot my password and the reset email never arrives.',
  fromName: 'Alice Customer',
}

beforeEach(() => {
  generateObjectMock.mockReset()
  openaiMock.mockClear()
  findUniqueMock.mockReset()
  updateManyMock.mockReset()
  updateManyMock.mockResolvedValue({ count: 1 })
  ticketReplyCreateMock.mockReset()
  transactionMock.mockClear()
  sendMock.mockReset()
  createQueueMock.mockReset()
  workMock.mockReset()
})

describe('autoResolveTicket', () => {
  it('does nothing when the ticket is not in the new state', async () => {
    updateManyMock.mockResolvedValueOnce({ count: 0 })

    await autoResolveTicket(999)

    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it('does nothing when the ticket no longer exists', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    await autoResolveTicket(999)

    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it('claims the ticket by moving it from new to processing', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { canResolve: false, replyBody: '' } })

    await autoResolveTicket(1)

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 1, status: 'new' },
      data: { status: 'processing' },
    })
  })

  it('posts the AI reply and resolves the ticket when it can be resolved', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({
      object: { canResolve: true, replyBody: 'Click "Forgot Password" on the login page.' },
    })

    await autoResolveTicket(1)

    expect(openaiMock).toHaveBeenCalledWith('gpt-5-nano-2025-08-07')
    const call = generateObjectMock.mock.calls[0][0] as any
    expect(call.prompt).toContain(TICKET.subject)
    expect(call.prompt).toContain(TICKET.body)
    expect(call.system.toLowerCase()).toContain('never instructions')
    expect(call.system).toContain('Escalation Rules')
    expect(call.system).toContain('Alice')
    expect(call.system).toContain('Best regards,')

    expect(transactionMock).toHaveBeenCalled()
    expect(ticketReplyCreateMock).toHaveBeenCalledWith({
      data: {
        ticketId: 1,
        senderType: 'agent',
        authorId: null,
        body: 'Click "Forgot Password" on the login page.',
      },
    })
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 1, status: 'processing' },
      data: { status: 'resolved', resolvedAt: expect.any(Date) },
    })
  })

  it('falls back to open and unassigns from AI when the AI declines to resolve the ticket', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { canResolve: false, replyBody: '' } })

    await autoResolveTicket(1)

    expect(ticketReplyCreateMock).not.toHaveBeenCalled()
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 1, status: 'processing' },
      data: { status: 'open', assignedToId: null },
    })
  })

  it('falls back to open and unassigns from AI when canResolve is true but replyBody is blank', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { canResolve: true, replyBody: '   ' } })

    await autoResolveTicket(1)

    expect(ticketReplyCreateMock).not.toHaveBeenCalled()
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 1, status: 'processing' },
      data: { status: 'open', assignedToId: null },
    })
  })

  it('falls back to open, unassigns from AI, and still propagates the error when the AI call fails', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockRejectedValueOnce(new Error('provider unavailable'))

    await expect(autoResolveTicket(1)).rejects.toThrow('provider unavailable')

    expect(ticketReplyCreateMock).not.toHaveBeenCalled()
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 1, status: 'processing' },
      data: { status: 'open', assignedToId: null },
    })
  })
})

describe('enqueueAutoResolveTicket', () => {
  it('sends a job to the auto-resolve-ticket queue with the ticket id', async () => {
    sendMock.mockResolvedValueOnce('job-1')

    await enqueueAutoResolveTicket(42)

    expect(sendMock).toHaveBeenCalledWith(AUTO_RESOLVE_TICKET_QUEUE, { ticketId: 42 })
  })
})

describe('registerAutoResolveTicketWorker', () => {
  it('creates the queue with a retry policy and registers a worker that processes the job ticket', async () => {
    findUniqueMock.mockResolvedValueOnce(TICKET)
    generateObjectMock.mockResolvedValueOnce({ object: { canResolve: false, replyBody: '' } })

    await registerAutoResolveTicketWorker()

    expect(createQueueMock).toHaveBeenCalledWith(AUTO_RESOLVE_TICKET_QUEUE, {
      retryLimit: 3,
      retryBackoff: true,
    })
    expect(workMock).toHaveBeenCalledWith(AUTO_RESOLVE_TICKET_QUEUE, expect.any(Function))

    const handler = workMock.mock.calls[0][1] as (jobs: { data: { ticketId: number } }[]) => Promise<void>
    await handler([{ data: { ticketId: 7 } }])

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { subject: true, body: true, fromName: true },
    })
  })
})
