import { Router } from 'express'
import { z } from 'zod'
import { Prisma, TicketStatus, TicketCategory } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { parseBody } from '../lib/parse-body'

export const ticketsRouter = Router()

const SORTABLE_FIELDS = ['subject', 'fromName', 'status', 'category', 'createdAt'] as const

const ticketQuerySchema = z.object({
  sortBy: z.enum(SORTABLE_FIELDS).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  search: z.string().optional(),
})

ticketsRouter.get('/', requireAuth, async (req, res) => {
  const query = parseBody(ticketQuerySchema, req.query, res)
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
    where: {
      ...(query.status !== undefined && { status: query.status }),
      ...(query.category !== undefined && { category: query.category }),
      ...(query.search && { subject: { contains: query.search, mode: 'insensitive' } }),
    },
    orderBy: { [query.sortBy]: query.sortOrder } as Prisma.TicketOrderByWithRelationInput,
  })

  res.json({ tickets })
})
