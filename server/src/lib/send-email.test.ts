import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const setApiKeyMock = mock()
const sendMock = mock()

mock.module('@sendgrid/mail', () => ({
  default: { setApiKey: setApiKeyMock, send: sendMock },
}))
afterAll(() => {
  mock.restore()
})

const { sendEmail } = await import('./send-email')

beforeEach(() => {
  setApiKeyMock.mockClear()
  sendMock.mockReset()
  sendMock.mockResolvedValue(undefined)
  process.env['SENDGRID_API_KEY'] = 'SG.test-key'
  process.env['SENDGRID_FROM_EMAIL'] = 'support@example.com'
  delete process.env['SENDGRID_FROM_NAME']
})

describe('sendEmail', () => {
  it('sends with the configured from address and default sender name', async () => {
    await sendEmail({ to: 'customer@example.com', toName: 'Alice Customer', subject: 'Re: Help', text: 'Hi there' })

    expect(sendMock).toHaveBeenCalledWith({
      to: { email: 'customer@example.com', name: 'Alice Customer' },
      from: { email: 'support@example.com', name: 'Support Team' },
      subject: 'Re: Help',
      text: 'Hi there',
    })
  })

  it('uses SENDGRID_FROM_NAME when set', async () => {
    process.env['SENDGRID_FROM_NAME'] = 'Acme Support'

    await sendEmail({ to: 'customer@example.com', toName: 'Alice Customer', subject: 'Re: Help', text: 'Hi there' })

    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ from: { email: 'support@example.com', name: 'Acme Support' } }))
  })

  it('sets In-Reply-To/References headers when inReplyToMessageId is given', async () => {
    await sendEmail({
      to: 'customer@example.com',
      toName: 'Alice Customer',
      subject: 'Re: Help',
      text: 'Hi there',
      inReplyToMessageId: '<abc123@example.com>',
    })

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { 'In-Reply-To': '<abc123@example.com>', References: '<abc123@example.com>' },
      }),
    )
  })

  it('omits headers when inReplyToMessageId is null', async () => {
    await sendEmail({
      to: 'customer@example.com',
      toName: 'Alice Customer',
      subject: 'Re: Help',
      text: 'Hi there',
      inReplyToMessageId: null,
    })

    expect(sendMock.mock.calls[0][0]).not.toHaveProperty('headers')
  })

  it('propagates a send failure', async () => {
    sendMock.mockRejectedValueOnce(new Error('provider rejected the request'))

    await expect(
      sendEmail({ to: 'customer@example.com', toName: 'Alice Customer', subject: 'Re: Help', text: 'Hi there' }),
    ).rejects.toThrow('provider rejected the request')
  })

  it('does not re-call setApiKey on a second send (lazy, one-time init)', async () => {
    await sendEmail({ to: 'a@example.com', toName: 'A', subject: 'S', text: 'T' })
    const callsAfterFirstSend = setApiKeyMock.mock.calls.length

    await sendEmail({ to: 'b@example.com', toName: 'B', subject: 'S', text: 'T' })

    expect(setApiKeyMock.mock.calls.length).toBe(callsAfterFirstSend)
  })
})
