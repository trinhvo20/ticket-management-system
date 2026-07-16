import { Router } from 'express'
import { inboundEmailSchema } from '@ticket/core'
import { prisma } from '../lib/prisma'
import { parseBody } from '../lib/parse-body'
import { webhookAuth } from '../middleware/webhook'

export const webhooksRouter = Router()

webhooksRouter.use(webhookAuth)

function normalizeSubject(s: string): string {
  return s.replace(/^(re:\s*)+/i, '').trim()
}

// Handle inbound support email: thread as customer reply if an open ticket exists, otherwise create a new ticket
webhooksRouter.post('/', async (req, res) => {
  const data = parseBody(inboundEmailSchema, req.body, res)
  if (!data) return

  const normalized = normalizeSubject(data.subject)

  const existingTicket = await prisma.ticket.findFirst({
    where: {
      fromEmail: data.from,
      status: 'open',
      subject: { equals: normalized, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (existingTicket) {
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: existingTicket.id,
        senderType: 'customer',
        authorId: null,
        body: data.body,
      },
    })
    res.status(201).json({ type: 'reply', replyId: reply.id, ticketId: existingTicket.id })
    return
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml,
      fromEmail: data.from,
      fromName: data.fromName,
    },
    select: { id: true, status: true },
  })

  res.status(201).json({ type: 'ticket', id: ticket.id, status: ticket.status })
})
