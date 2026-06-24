import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

export const ticketsRouter = Router()

ticketsRouter.get('/', requireAuth, async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      status: true,
      category: true,
      assignedToId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json({ tickets })
})
