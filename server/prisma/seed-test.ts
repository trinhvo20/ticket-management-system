import 'dotenv/config'
import { auth } from '../src/lib/auth'
import { prisma } from '../src/lib/prisma'
import { Role } from '@prisma/client'

async function upsertUser(email: string, password: string, name: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists, skipping.`)
    return
  }

  const ctx = await auth.$context
  const hash = await ctx.password.hash(password)

  const createdUser = await ctx.internalAdapter.createUser({
    email,
    name,
    emailVerified: true,
    role,
  })

  await ctx.internalAdapter.linkAccount({
    userId: createdUser.id,
    providerId: 'credential',
    accountId: createdUser.id,
    password: hash,
  })

  console.log(`Created ${role} user: ${email}`)
}

async function main() {
  await upsertUser(
    process.env.ADMIN_EMAIL ?? 'admin@example.com',
    process.env.ADMIN_PASSWORD ?? 'password123',
    'Admin',
    Role.admin,
  )

  await upsertUser('agent@example.com', 'password123', 'Agent', Role.agent)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
