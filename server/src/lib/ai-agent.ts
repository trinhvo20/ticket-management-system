import { Role } from '@prisma/client'
import { AI_AGENT_EMAIL } from '@ticket/core'
import { auth } from './auth'
import { prisma } from './prisma'

export { AI_AGENT_EMAIL }
export const AI_AGENT_NAME = 'AI'

export async function getAiAgentId(): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: AI_AGENT_EMAIL },
    select: { id: true },
  })
  return user.id
}

// Idempotently creates the AI agent user. It never logs in, so no password/account is linked.
export async function ensureAiAgentUser(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } })
  if (existing) return

  const ctx = await auth.$context
  await ctx.internalAdapter.createUser({
    email: AI_AGENT_EMAIL,
    name: AI_AGENT_NAME,
    emailVerified: true,
    role: Role.agent,
  })
}
