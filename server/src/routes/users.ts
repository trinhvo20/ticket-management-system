import { Router } from 'express'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { auth } from '../lib/auth'
import { requireAuth, requireAdmin } from '../middleware/auth'

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'agent']).default('agent'),
})

export const usersRouter = Router()

usersRouter.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ users })
})

usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }

  const { name, email, password, role } = result.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'A user with that email already exists' })
    return
  }

  const ctx = await auth.$context
  const hash = await ctx.password.hash(password)

  const created = await ctx.internalAdapter.createUser({
    email,
    name,
    emailVerified: true,
    role: role === 'admin' ? Role.admin : Role.agent,
  })

  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: 'credential',
    accountId: created.id,
    password: hash,
  })

  const user = await prisma.user.findUnique({
    where: { id: created.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  res.status(201).json({ user })
})

usersRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params['id'] as string

  if (id === req.user.id) {
    res.status(400).json({ error: 'Cannot delete your own account' })
    return
  }

  try {
    await prisma.user.delete({ where: { id } })
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'User not found' })
      return
    }
    throw err
  }

  res.status(204).send()
})
