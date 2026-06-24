import type { Response } from 'express'

type Schema<T> = {
  safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } }
}

export function parseBody<T>(schema: Schema<T>, body: unknown, res: Response): T | null {
  const result = schema.safeParse(body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return null
  }
  return result.data
}
