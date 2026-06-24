import 'dotenv/config'
import { prisma } from './src/lib/prisma'

const users = await prisma.user.findMany({
  select: {
    email: true, name: true, role: true, deletedAt: true,
    accounts: { select: { providerId: true, password: true } },
  },
  where: { email: { in: ['admin@example.com', 'agent@example.com'] } },
})
console.log(JSON.stringify(users, null, 2))
await prisma.$disconnect()
