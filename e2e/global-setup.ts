import { execSync } from 'child_process'
import { config } from 'dotenv'
import { resolve } from 'path'

export default async function globalSetup() {
  const serverDir = resolve(__dirname, '../server')

  config({ path: resolve(serverDir, '.env.test'), override: true })

  const env = { ...process.env } as Record<string, string>

  execSync('bunx prisma migrate deploy', {
    cwd: serverDir,
    env,
    stdio: 'inherit',
  })

  execSync('bun prisma/seed-test.ts', {
    cwd: serverDir,
    env,
    stdio: 'inherit',
  })
}
