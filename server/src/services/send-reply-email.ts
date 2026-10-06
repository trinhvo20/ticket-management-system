import { prisma } from '../lib/prisma'
import { boss } from '../lib/boss'
import { sendEmail } from '../lib/send-email'

export const SEND_REPLY_EMAIL_QUEUE = 'send-reply-email'

interface SendReplyEmailJob {
  replyId: number
}

// Enqueues an agent reply for emailing to the customer and returns once the job is durably
// persisted — the queue insert is fast, so this does not block on the network send itself.
export async function enqueueSendReplyEmail(replyId: number): Promise<void> {
  await boss.send(SEND_REPLY_EMAIL_QUEUE, { replyId } satisfies SendReplyEmailJob)
}

// Emails an agent reply to the ticket's customer. Threads under the ticket's original inbound
// Message-ID (when known) via In-Reply-To/References. Throws on failure so the pg-boss worker
// can mark the job failed and let the queue's retry policy handle it.
export async function sendReplyEmail(replyId: number): Promise<void> {
  const reply = await prisma.ticketReply.findUnique({
    where: { id: replyId },
    select: {
      body: true,
      ticket: { select: { fromEmail: true, fromName: true, subject: true, messageId: true } },
    },
  })
  if (!reply) return

  const { ticket } = reply
  const subject = /^re:/i.test(ticket.subject) ? ticket.subject : `Re: ${ticket.subject}`

  await sendEmail({
    to: ticket.fromEmail,
    toName: ticket.fromName,
    subject,
    text: reply.body,
    inReplyToMessageId: ticket.messageId,
  })
}

// Creates the queue (idempotent) and registers the worker that processes it. Call once at startup.
export async function registerSendReplyEmailWorker(): Promise<void> {
  await boss.createQueue(SEND_REPLY_EMAIL_QUEUE, { retryLimit: 3, retryBackoff: true })
  await boss.work<SendReplyEmailJob>(SEND_REPLY_EMAIL_QUEUE, async ([job]) => {
    await sendReplyEmail(job.data.replyId)
  })
}
