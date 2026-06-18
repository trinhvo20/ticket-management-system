import { Router, type Response } from 'express'
import { Role } from '@prisma/client'
import { createUserSchema, updateUserSchema } from '@ticket/core'
import { prisma } from '../lib/prisma'
import { auth } from '../lib/auth'
import { requireAuth, requireAdmin } from '../middleware/auth'

function parseBody<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return null
  }
  return result.data
}

export const usersRouter = Router()

// Get all users
usersRouter.get('/', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  res.json({ users })
})

// Create user
usersRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  const data = parseBody(createUserSchema, req.body, res)
  if (!data) return
  const { name, email, password, role } = data

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

// Update user
usersRouter.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params['id'] as string

  const data = parseBody(updateUserSchema, req.body, res)
  if (!data) return
  const { name, email, role, password } = data

  if (id === req.user.id && role !== req.user.role) {
    res.status(400).json({ error: 'Cannot change your own role' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing && existing.id !== id) {
    res.status(409).json({ error: 'A user with that email already exists' })
    return
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { name, email, role: role === 'admin' ? Role.admin : Role.agent },
    })

    if (password) {
      const ctx = await auth.$context
      const hash = await ctx.password.hash(password)
      await prisma.account.updateMany({
        where: { userId: id, providerId: 'credential' },
        data: { password: hash },
      })
    }
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'User not found' })
      return
    }
    throw err
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  res.json({ user })
})

// Delete user
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
