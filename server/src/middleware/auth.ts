import type { NextFunction, Request, Response } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { Role } from '@ticket/core'
import { auth } from '../lib/auth'
import { prisma } from '../lib/prisma'

type Session = typeof auth.$Infer.Session

declare global {
  namespace Express {
    interface Request {
      user: Session['user']
      session: Session['session']
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Query deletedAt directly — Better Auth additionalFields does not handle nullable dates reliably
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true },
  })

  if (dbUser?.deletedAt) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.user = session.user
  req.session = session.session
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== Role.Admin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}
