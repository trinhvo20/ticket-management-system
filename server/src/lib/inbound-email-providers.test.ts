import { describe, expect, it } from 'bun:test'
import { mapCloudMailinPayload } from './inbound-email-providers'

describe('mapCloudMailinPayload', () => {
  it('maps a plain normalized payload', () => {
    const result = mapCloudMailinPayload({
      envelope: { from: 'customer@example.com' },
      headers: { from: 'Alice Customer <customer@example.com>', subject: 'Cannot log in' },
      plain: "I can't log in to my account.",
      html: '<p>I can&#39;t log in to my account.</p>',
    })

    expect(result).toEqual({
      from: 'customer@example.com',
      fromName: 'Alice Customer',
      subject: 'Cannot log in',
      body: "I can't log in to my account.",
      bodyHtml: '<p>I can&#39;t log in to my account.</p>',
    })
  })

  it('strips an Outlook-style quoted reply below an underscore separator', () => {
    const result = mapCloudMailinPayload({
      envelope: { from: 'trinhvo201097@gmail.com' },
      headers: { from: 'Trinh Vo <trinhvo201097@gmail.com>', subject: 'Re: refund request' },
      plain: [
        'Any update on this?',
        '________________________________',
        'From: Trinh Vo <trinhvo201097@gmail.com>',
        'Sent: Thursday, October 1, 2026 11:12 AM',
        'To: f4a25194c227e55c3b77@cloudmailin.net <f4a25194c227e55c3b77@cloudmailin.net>',
        'Subject: refund request',
        '',
        'I want request refund for my course',
      ].join('\n'),
    })

    expect(result?.body).toBe('Any update on this?')
  })

  it('strips an inline Outlook-style From/Sent header without a separator line', () => {
    const result = mapCloudMailinPayload({
      envelope: { from: 'trinhvo201097@gmail.com' },
      headers: { from: 'Trinh Vo <trinhvo201097@gmail.com>', subject: 'Re: refund request' },
      plain: ['Following up on this.', 'From: Trinh Vo <trinhvo201097@gmail.com>', 'Sent: Thursday, October 1, 2026', ''].join(
        '\n',
      ),
    })

    expect(result?.body).toBe('Following up on this.')
  })

  it('strips a Gmail-style "On ... wrote:" quote', () => {
    const result = mapCloudMailinPayload({
      envelope: { from: 'trinhvo201097@gmail.com' },
      headers: { from: 'Trinh Vo <trinhvo201097@gmail.com>', subject: 'Re: refund request' },
      plain: ['Thanks, got it.', 'On Thu, Oct 1, 2026 at 11:12 AM Trinh Vo <trinhvo201097@gmail.com> wrote:', '> original message'].join(
        '\n',
      ),
    })

    expect(result?.body).toBe('Thanks, got it.')
  })

  it('falls back to the raw text when stripping would leave nothing', () => {
    const result = mapCloudMailinPayload({
      envelope: { from: 'trinhvo201097@gmail.com' },
      headers: { from: 'Trinh Vo <trinhvo201097@gmail.com>', subject: 'Re: refund request' },
      plain: ['________________________________', 'From: a <a@example.com>', 'Sent: today'].join('\n'),
    })

    expect(result?.body).toContain('From: a <a@example.com>')
  })

  it('returns null when there is no usable body', () => {
    const result = mapCloudMailinPayload({ envelope: { from: 'customer@example.com' }, headers: {} })
    expect(result).toBeNull()
  })

  it('parses a bare email with no display name in the From header', () => {
    const result = mapCloudMailinPayload({
      envelope: { from: 'customer@example.com' },
      headers: { from: 'customer@example.com', subject: 'Help' },
      plain: 'Need help.',
    })

    expect(result).toEqual(
      expect.objectContaining({ from: 'customer@example.com', fromName: 'customer@example.com' }),
    )
  })
})
