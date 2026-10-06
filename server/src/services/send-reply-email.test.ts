import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const findUniqueMock = mock()
const sendMock = mock()
const createQueueMock = mock()
const workMock = mock()
const sendEmailMock = mock()

mock.module('../lib/prisma', () => ({ prisma: { ticketReply: { findUnique: findUniqueMock } } }))
mock.module('../lib/boss', () => ({ boss: { send: sendMock, createQueue: createQueueMock, work: workMock } }))
mock.module('../lib/send-email', () => ({ sendEmail: sendEmailMock }))
afterAll(() => {
  mock.restore()
})

const { enqueueSendReplyEmail, sendReplyEmail, registerSendReplyEmailWorker, SEND_REPLY_EMAIL_QUEUE } = await import(
  './send-reply-email'
)

beforeEach(() => {
  findUniqueMock.mockReset()
  sendMock.mockReset()
  createQueueMock.mockReset()
  workMock.mockReset()
  sendEmailMock.mockReset()
  sendEmailMock.mockResolvedValue(undefined)
})

describe('enqueueSendReplyEmail', () => {
  it('sends a job to the send-reply-email queue with the reply id', async () => {
    await enqueueSendReplyEmail(42)

    expect(sendMock).toHaveBeenCalledWith(SEND_REPLY_EMAIL_QUEUE, { replyId: 42 })
  })
})

describe('sendReplyEmail', () => {
  it('does nothing when the reply no longer exists', async () => {
    findUniqueMock.mockResolvedValueOnce(null)

    await sendReplyEmail(999)

    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('emails the customer, prefixing the subject with Re: and threading via the ticket Message-ID', async () => {
    findUniqueMock.mockResolvedValueOnce({
      body: 'Here is the fix.',
      ticket: {
        fromEmail: 'customer@example.com',
        fromName: 'Alice Customer',
        subject: 'Cannot log in',
        messageId: '<orig123@example.com>',
      },
    })

    await sendReplyEmail(1)

    expect(sendEmailMock).toHaveBeenCalledWith({
      to: 'customer@example.com',
      toName: 'Alice Customer',
      subject: 'Re: Cannot log in',
      text: 'Here is the fix.',
      inReplyToMessageId: '<orig123@example.com>',
    })
  })

  it('does not double-prefix a subject that already starts with Re:', async () => {
    findUniqueMock.mockResolvedValueOnce({
      body: 'Following up.',
      ticket: { fromEmail: 'customer@example.com', fromName: 'Alice', subject: 'Re: Cannot log in', messageId: null },
    })

    await sendReplyEmail(1)

    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Re: Cannot log in' }))
  })

  it('propagates a send failure so the queue can retry', async () => {
    findUniqueMock.mockResolvedValueOnce({
      body: 'Here is the fix.',
      ticket: { fromEmail: 'customer@example.com', fromName: 'Alice', subject: 'Cannot log in', messageId: null },
    })
    sendEmailMock.mockRejectedValueOnce(new Error('provider unavailable'))

    await expect(sendReplyEmail(1)).rejects.toThrow('provider unavailable')
  })
})

describe('registerSendReplyEmailWorker', () => {
  it('creates the queue with a retry policy and registers a worker that processes the job', async () => {
    findUniqueMock.mockResolvedValueOnce({
      body: 'Hi',
      ticket: { fromEmail: 'customer@example.com', fromName: 'Alice', subject: 'Hi', messageId: null },
    })

    await registerSendReplyEmailWorker()

    expect(createQueueMock).toHaveBeenCalledWith(SEND_REPLY_EMAIL_QUEUE, { retryLimit: 3, retryBackoff: true })
    expect(workMock).toHaveBeenCalledWith(SEND_REPLY_EMAIL_QUEUE, expect.any(Function))

    const handler = workMock.mock.calls[0][1] as (jobs: { data: { replyId: number } }[]) => Promise<void>
    await handler([{ data: { replyId: 9 } }])

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 9 },
      select: {
        body: true,
        ticket: { select: { fromEmail: true, fromName: true, subject: true, messageId: true } },
      },
    })
  })
})
