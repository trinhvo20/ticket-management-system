import { Router } from 'express'
import { inboundEmailSchema } from '@ticket/core'
import { prisma } from '../lib/prisma'
import { parseBody } from '../lib/parse-body'
import { webhookAuth } from '../middleware/webhook'

export const webhooksRouter = Router()

webhooksRouter.use(webhookAuth)

// Create ticket
webhooksRouter.post('/', async (req, res) => {
  const data = parseBody(inboundEmailSchema, req.body, res)
  if (!data) return

  const ticket = await prisma.ticket.create({
    data: {
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml,
      fromEmail: data.from,
      fromName: data.fromName,
    },
  })

  res.status(201).json({ id: ticket.id, status: ticket.status })
})
