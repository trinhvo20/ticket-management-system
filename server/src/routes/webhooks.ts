import { Router, type Response } from 'express'
import { inboundEmailSchema, type InboundEmailInput } from '@ticket/core'
import { prisma } from '../lib/prisma'
import { parseBody } from '../lib/parse-body'
import { webhookAuth } from '../middleware/webhook'
import { enqueueClassifyTicket } from '../services/classify-ticket'
import { enqueueAutoResolveTicket } from '../services/resolve-ticket'
import { getAiAgentId } from '../lib/ai-agent'
import { mapCloudMailinPayload } from '../lib/inbound-email-providers'

export const webhooksRouter = Router()

webhooksRouter.use(webhookAuth)

function normalizeSubject(s: string): string {
  return s.replace(/^(re:\s*)+/i, '').trim()
}

// Shared by every provider route once its payload has been mapped to the normalized shape:
// thread as a customer reply if an open ticket exists, otherwise create a new ticket.
async function handleInboundEmail(data: InboundEmailInput, res: Response) {
  const normalized = normalizeSubject(data.subject)

  const existingTicket = await prisma.ticket.findFirst({
    where: {
      fromEmail: data.from,
      status: { in: ['new', 'processing', 'open'] },
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
        bodyHtml: data.bodyHtml,
      },
    })
    res.status(201).json({ type: 'reply', replyId: reply.id, ticketId: existingTicket.id })
    return
  }

  // Assign to the AI agent so it can attempt auto-resolution; auto-resolve unassigns it if it can't.
  const aiAgentId = await getAiAgentId()

  const ticket = await prisma.ticket.create({
    data: {
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml,
      fromEmail: data.from,
      fromName: data.fromName,
      messageId: data.messageId,
      assignedToId: aiAgentId,
    },
    select: { id: true, status: true },
  })

  // Enqueues the GPT classification and auto-resolve jobs; pg-boss processes them in the
  // background so the slow AI calls never delay this response, and they survive a server restart.
  await enqueueClassifyTicket(ticket.id)
  await enqueueAutoResolveTicket(ticket.id)

  res.status(201).json({ type: 'ticket', id: ticket.id, status: ticket.status })
}

// Already-normalized payload — for providers that are mapped to inboundEmailSchema upstream.
webhooksRouter.post('/', async (req, res) => {
  const data = parseBody(inboundEmailSchema, req.body, res)
  if (!data) return
  await handleInboundEmail(data, res)
})

// CloudMailin's "Normalized JSON" format — https://docs.cloudmailin.com/http_post_formats/json_normalized/
webhooksRouter.post('/cloudmailin', async (req, res) => {
  const mapped = mapCloudMailinPayload(req.body)
  if (!mapped) {
    res.status(400).json({ error: 'Could not extract a message body from the inbound email' })
    return
  }
  const data = parseBody(inboundEmailSchema, mapped, res)
  if (!data) return
  await handleInboundEmail(data, res)
})
