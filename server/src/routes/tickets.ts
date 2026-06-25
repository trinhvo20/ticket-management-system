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
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
})

ticketsRouter.get('/', requireAuth, async (req, res) => {
  const query = parseBody(ticketQuerySchema, req.query, res)
  if (!query) return

  const where: Prisma.TicketWhereInput = {
    ...(query.status !== undefined && { status: query.status }),
    ...(query.category !== undefined && { category: query.category }),
    ...(query.search && { subject: { contains: query.search, mode: 'insensitive' } }),
  }

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
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
      where,
      orderBy: { [query.sortBy]: query.sortOrder } as Prisma.TicketOrderByWithRelationInput,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ticket.count({ where }),
  ])

  res.json({ tickets, total })
})
