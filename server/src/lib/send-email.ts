import sgMail from '@sendgrid/mail'

let initialized = false

function ensureInitialized(): void {
  if (initialized) return
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  initialized = true
}

interface SendEmailOptions {
  to: string
  toName: string
  subject: string
  text: string
  // Message-ID of the email this is a reply to, used to thread the outbound email in the
  // customer's mail client via In-Reply-To/References. Omit for a fresh (non-reply) email.
  inReplyToMessageId?: string | null
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  ensureInitialized()

  await sgMail.send({
    to: { email: opts.to, name: opts.toName },
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: process.env.SENDGRID_FROM_NAME || 'Support Team',
    },
    subject: opts.subject,
    text: opts.text,
    ...(opts.inReplyToMessageId
      ? { headers: { 'In-Reply-To': opts.inReplyToMessageId, References: opts.inReplyToMessageId } }
      : {}),
  })
}
