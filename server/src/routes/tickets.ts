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

// Get a list of tickets with optional filtering, sorting, and pagination
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

// Get a specific ticket
ticketsRouter.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ticket ID' })
    return
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      body: true,
      bodyHtml: true,
      fromEmail: true,
      fromName: true,
      status: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true } },
    },
  })

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }

  res.json({ ticket })
})

const updateTicketSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).nullable().optional(),
})

// Update a ticket's status, category, or assigned agent
ticketsRouter.patch('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params['id'] as string, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ticket ID' })
    return
  }

  const data = parseBody(updateTicketSchema, req.body, res)
  if (!data) return

  if (data.assignedToId !== undefined && data.assignedToId !== null) {
    const user = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { id: true, deletedAt: true },
    })
    if (!user || user.deletedAt) {
      res.status(400).json({ error: 'Assigned user not found' })
      return
    }
  }

  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.category !== undefined && { category: data.category }),
      },
      select: {
        id: true,
        status: true,
        category: true,
        assignedTo: { select: { id: true, name: true } },
      },
    })
    res.json({ ticket })
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }
    throw err
  }
})
