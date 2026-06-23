import { betterAuth } from 'better-auth'
import { createAuthMiddleware, APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  trustedOrigins: [process.env.CLIENT_URL ?? 'http://localhost:5173'],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        input: false,
        defaultValue: 'agent',
        required: true,
      },
      deletedAt: {
        type: 'date',
        input: false,
        required: false,
        returned: true,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-in/email') {
        const email = ctx.body?.email
        if (email) {
          const user = await prisma.user.findUnique({
            where: { email },
            select: { deletedAt: true },
          })
          if (user?.deletedAt) {
            throw new APIError('UNAUTHORIZED', { message: 'Invalid email or password' })
          }
        }
      }
    }),
  },
})
