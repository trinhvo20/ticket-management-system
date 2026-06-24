import { createHash, timingSafeEqual } from 'crypto'
import type { NextFunction, Request, Response } from 'express'

export function webhookAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  const secret = process.env.EMAIL_WEBHOOK_SECRET
  if (!secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // Hash both sides to normalize buffer length before timing-safe compare
  const tokenBuf = createHash('sha256').update(token).digest()
  const secretBuf = createHash('sha256').update(secret).digest()
  if (!timingSafeEqual(tokenBuf, secretBuf)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}
