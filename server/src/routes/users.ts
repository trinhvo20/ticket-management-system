import { Router } from 'express'
import { Role } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { auth } from '../lib/auth'
import { requireAuth, requireAdmin } from '../middleware/auth'

export const usersRouter = Router()

usersRouter.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ users })
})

usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role = 'agent' } = req.body

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' })
    return
  }

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
