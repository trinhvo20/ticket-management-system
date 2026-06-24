import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAs(page: Page, role: 'admin' | 'agent') {
  const credentials = {
    admin: { email: 'admin@example.com', password: 'password123' },
    agent: { email: 'agent@example.com', password: 'password123' },
  }
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(credentials[role].email)
  await page.getByLabel(/password/i).fill(credentials[role].password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')
}

const SERVER_URL = process.env.SERVER_URL   // http://localhost:3099
const SECRET = process.env.EMAIL_WEBHOOK_SECRET  // dev-webhook-secret

async function createTicketViaWebhook(
  request: APIRequestContext,
  subject: string,
  fromName = 'E2E Tester',
) {
  const response = await request.post(`${SERVER_URL}/api/webhooks/email`, {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: {
      from: 'tester@example.com',
      fromName,
      subject,
      body: 'Test body',
    },
  })
  // Surface a clear failure if the webhook itself is broken
  if (!response.ok()) {
    throw new Error(
      `Webhook POST failed: ${response.status()} ${await response.text()}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Tickets page tests
// ---------------------------------------------------------------------------

test.describe('Tickets page', () => {
  // -------------------------------------------------------------------------
  // Auth guard
  // -------------------------------------------------------------------------

  test.describe('unauthenticated access', () => {
    test('redirects unauthenticated user visiting /tickets to /login', async ({ page }) => {
      await page.goto('/tickets')
      await expect(page).toHaveURL('/login')
    })
  })

  // -------------------------------------------------------------------------
  // Navigation — role visibility
  // -------------------------------------------------------------------------

  test.describe('navigation', () => {
    test('agent sees a "Tickets" link in the nav', async ({ page }) => {
      await loginAs(page, 'agent')
      await expect(page.getByRole('link', { name: 'Tickets' })).toBeVisible()
    })

    test('admin sees a "Tickets" link in the nav', async ({ page }) => {
      await loginAs(page, 'admin')
      await expect(page.getByRole('link', { name: 'Tickets' })).toBeVisible()
    })

    test('agent clicking the "Tickets" nav link loads the Tickets page', async ({ page }) => {
      await loginAs(page, 'agent')
      await page.getByRole('link', { name: 'Tickets' }).click()
      await expect(page).toHaveURL('/tickets')
      await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    })

    test('admin clicking the "Tickets" nav link loads the Tickets page', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.getByRole('link', { name: 'Tickets' }).click()
      await expect(page).toHaveURL('/tickets')
      await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    })

    test('agent does not see a "Users" link in the nav', async ({ page }) => {
      await loginAs(page, 'agent')
      await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // End-to-end ticket creation via webhook
  // -------------------------------------------------------------------------

  test.describe('ticket list — end-to-end creation', () => {
    test('ticket created via webhook appears in the table with subject and sender name', async ({
      page,
      request,
    }) => {
      const subject = `E2E ticket subject ${Date.now()}`
      const fromName = 'E2E Tester'

      await createTicketViaWebhook(request, subject, fromName)

      await loginAs(page, 'agent')
      await page.goto('/tickets')
      await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

      // The row containing the unique subject must be visible
      const ticketRow = page.getByRole('row').filter({ hasText: subject })
      await expect(ticketRow).toBeVisible()
      // Sender name is also rendered in the same row
      await expect(ticketRow.getByText(fromName)).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // Newest-first ordering
  // -------------------------------------------------------------------------

  test.describe('ticket list — ordering', () => {
    test('most-recently created ticket appears before an earlier one', async ({
      page,
      request,
    }) => {
      const firstSubject = `E2E first ${Date.now()}`
      // Create sequentially so createdAt values are distinct
      await createTicketViaWebhook(request, firstSubject)

      const secondSubject = `E2E second ${Date.now()}`
      await createTicketViaWebhook(request, secondSubject)

      await loginAs(page, 'agent')
      await page.goto('/tickets')
      await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

      // Both rows must be present
      const firstRow = page.getByRole('row').filter({ hasText: firstSubject })
      const secondRow = page.getByRole('row').filter({ hasText: secondSubject })
      await expect(firstRow).toBeVisible()
      await expect(secondRow).toBeVisible()

      // The second (newer) ticket's row must appear above the first (older) one.
      // Playwright's bounding-box Y coordinate is the reliable cross-platform check.
      const firstRowY = (await firstRow.boundingBox())!.y
      const secondRowY = (await secondRow.boundingBox())!.y
      expect(secondRowY).toBeLessThan(firstRowY)
    })
  })
})
