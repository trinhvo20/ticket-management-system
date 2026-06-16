import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, 'server/.env.test') })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command: 'bun src/index.ts',
      cwd: resolve(__dirname, 'server'),
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      env: { ...process.env } as Record<string, string>,
    },
    {
      command: 'bun dev',
      cwd: resolve(__dirname, 'client'),
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
