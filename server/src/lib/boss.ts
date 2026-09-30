import { PgBoss } from 'pg-boss'

function createBoss() {
  const boss = new PgBoss(process.env.DATABASE_URL!)
  boss.on('error', (error) => console.error('pg-boss error:', error))
  return boss
}

const globalForBoss = globalThis as unknown as { boss: PgBoss }

export const boss = globalForBoss.boss ?? createBoss()

if (process.env.NODE_ENV !== 'production') globalForBoss.boss = boss

export async function startBoss(): Promise<void> {
  await boss.start()
}

export async function stopBoss(): Promise<void> {
  await boss.stop()
}
