import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { parseBody } from '../lib/parse-body'

export const ticketsRouter = Router()

const SORTABLE_FIELDS = ['subject', 'fromName', 'status', 'category', 'createdAt'] as const

const ticketSortSchema = z.object({
  sortBy: z.enum(SORTABLE_FIELDS).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

ticketsRouter.get('/', requireAuth, async (req, res) => {
  const query = parseBody(ticketSortSchema, req.query, res)
  if (!query) return

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
    orderBy: { [query.sortBy]: query.sortOrder } as Prisma.TicketOrderByWithRelationInput,
  })

  res.json({ tickets })
})
