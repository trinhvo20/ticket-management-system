import type { NextFunction, Request, Response } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth'

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

  req.user = session.user
  req.session = session.session
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}
