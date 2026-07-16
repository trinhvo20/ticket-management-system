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

const SERVER_URL = process.env.SERVER_URL
const SECRET = process.env.EMAIL_WEBHOOK_SECRET

async function createTicketViaWebhook(
  request: APIRequestContext,
  subject: string,
  body = 'E2E test body',
  fromName = 'E2E Tester',
) {
  const response = await request.post(`${SERVER_URL}/api/webhooks/email`, {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: { from: 'tester@example.com', fromName, subject, body },
  })
  if (!response.ok()) {
    throw new Error(`Webhook POST failed: ${response.status()} ${await response.text()}`)
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Ticket Detail page', () => {
  // -------------------------------------------------------------------------
  // Auth guard
  // -------------------------------------------------------------------------

  test.describe('unauthenticated access', () => {
    test('redirects unauthenticated user visiting /tickets/:id to /login', async ({ page }) => {
      await page.goto('/tickets/1')
      await expect(page).toHaveURL('/login')
    })
  })

  // -------------------------------------------------------------------------
  // Navigation from ticket list
  // -------------------------------------------------------------------------

  test.describe('navigation', () => {
    test('clicking a ticket subject on the list navigates to the detail page', async ({
      page,
      request,
    }) => {
      const subject = `E2E nav ${Date.now()}`
      await createTicketViaWebhook(request, subject)
      await loginAs(page, 'agent')
      await page.goto('/tickets')

      await page.getByRole('link', { name: subject }).click()

      await expect(page).toHaveURL(/\/tickets\/\d+/)
      await expect(page.getByText(subject)).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // Full-stack status update (unit tests mock updateTicket — only E2E can
  // verify the mutation actually persists to the DB)
  // -------------------------------------------------------------------------

  test.describe('status update', () => {
    test('changed status persists after page reload', async ({ page, request }) => {
      const subject = `E2E status ${Date.now()}`
      await createTicketViaWebhook(request, subject)
      await loginAs(page, 'agent')
      await page.goto('/tickets')
      await page.getByRole('link', { name: subject }).click()
      await expect(page).toHaveURL(/\/tickets\/\d+/)
      await expect(page.getByText(subject)).toBeVisible()

      const statusSelect = page.getByRole('combobox').first()
      await statusSelect.click()
      await page.getByRole('option', { name: 'Resolved' }).click()
      // Wait for the query to re-fetch and the trigger to reflect the saved value
      await expect(statusSelect).toHaveText('Resolved')

      await page.reload()
      await expect(page.getByRole('combobox').first()).toHaveText('Resolved')
    })
  })

  // -------------------------------------------------------------------------
  // Full-stack reply submission (unit tests mock createReply and getReplies —
  // only E2E can verify the reply is saved and then reloaded from the DB)
  // -------------------------------------------------------------------------

  test.describe('reply submission', () => {
    test('submitted reply appears in the reply list', async ({ page, request }) => {
      const subject = `E2E reply ${Date.now()}`
      await createTicketViaWebhook(request, subject)
      await loginAs(page, 'agent')
      await page.goto('/tickets')
      await page.getByRole('link', { name: subject }).click()
      await expect(page).toHaveURL(/\/tickets\/\d+/)
      await expect(page.getByText(subject)).toBeVisible()

      const replyBody = `Reply body ${Date.now()}`
      await page.getByPlaceholder('Write your reply…').fill(replyBody)
      await page.getByRole('button', { name: /send reply/i }).click()

      await expect(page.getByText(replyBody)).toBeVisible()
    })
  })
})
