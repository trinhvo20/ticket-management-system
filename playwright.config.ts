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
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      // Run on a dedicated test port (3099) so the E2E server never conflicts with
      // the dev server on 3001, and always uses the test DATABASE_URL from env.
      command: 'bun src/index.ts',
      cwd: resolve(__dirname, 'server'),
      url: 'http://localhost:3099/health',
      reuseExistingServer: false,
      env: { ...process.env, PORT: '3099', NODE_ENV: 'test' } as Record<string, string>,
    },
    {
      // Port 5174 avoids conflict with the dev client on 5173.
      // --mode e2e loads client/.env.e2e which points VITE_SERVER_URL at port 3099.
      command: 'bunx vite --mode e2e --port 5174',
      cwd: resolve(__dirname, 'client'),
      url: 'http://localhost:5174',
      reuseExistingServer: false,
    },
  ],
})
