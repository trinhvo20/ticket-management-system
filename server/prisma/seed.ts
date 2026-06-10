import 'dotenv/config'
import { auth } from '../src/lib/auth'
import { prisma } from '../src/lib/prisma'
import { Role } from '@prisma/client'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists, skipping.`)
    return
  }

  const ctx = await auth.$context
  const hash = await ctx.password.hash(password)

  const createdUser = await ctx.internalAdapter.createUser({
    email,
    name: 'Admin',
    emailVerified: true,
    role: Role.admin,
  })

  await ctx.internalAdapter.linkAccount({
    userId: createdUser.id,
    providerId: 'credential',
    accountId: createdUser.id,
    password: hash,
  })

  console.log(`Created admin user ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
