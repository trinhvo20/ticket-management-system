import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// playwright.config.ts loads server/.env.test via dotenv before starting workers,
// so SERVER_URL and EMAIL_WEBHOOK_SECRET are available via process.env.
const WEBHOOK_URL = `${process.env.SERVER_URL}/api/webhooks/email`
const SECRET = process.env.EMAIL_WEBHOOK_SECRET ?? 'dev-webhook-secret'

// A minimal valid payload satisfying all required Zod constraints.
const VALID_PAYLOAD = {
  from: 'customer@example.com',
  fromName: 'Test Customer',
  subject: 'Need help with my order',
  body: 'I placed an order last week and have not received a confirmation email.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ---------------------------------------------------------------------------
// Email Webhook — POST /api/webhooks/email
// ---------------------------------------------------------------------------

test.describe('Email webhook — POST /api/webhooks/email', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  test.describe('happy path', () => {
    test('returns 201 with id and status "open" for a valid payload with all fields', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: {
          ...VALID_PAYLOAD,
          bodyHtml: '<p>I placed an order last week and have not received a confirmation email.</p>',
        },
      })

      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(typeof body.id).toBe('number')
      expect(body.status).toBe('open')
    })

    test('returns 201 with id and status "open" for a minimal valid payload without bodyHtml', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: VALID_PAYLOAD,
      })

      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(typeof body.id).toBe('number')
      expect(body.status).toBe('open')
    })

    test('each successful request creates a new ticket with a distinct id', async ({ request }) => {
      const [res1, res2] = await Promise.all([
        request.post(WEBHOOK_URL, { headers: authHeaders(SECRET), data: VALID_PAYLOAD }),
        request.post(WEBHOOK_URL, { headers: authHeaders(SECRET), data: VALID_PAYLOAD }),
      ])

      const [body1, body2] = await Promise.all([res1.json(), res2.json()])

      expect(res1.status()).toBe(201)
      expect(res2.status()).toBe(201)
      expect(body1.id).not.toBe(body2.id)
    })
  })

  // -------------------------------------------------------------------------
  // Authentication — missing or wrong secret
  // -------------------------------------------------------------------------

  test.describe('authentication', () => {
    test('returns 401 when the Authorization header is absent', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        data: VALID_PAYLOAD,
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    test('returns 401 when the Authorization header uses the wrong secret', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders('wrong-secret-value'),
        data: VALID_PAYLOAD,
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    test('returns 401 when the Authorization header has no Bearer prefix', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: { Authorization: SECRET },
        data: VALID_PAYLOAD,
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    test('returns 401 when the Authorization header is empty', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: { Authorization: '' },
        data: VALID_PAYLOAD,
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })
  })

  // -------------------------------------------------------------------------
  // Validation — missing required fields
  // -------------------------------------------------------------------------

  test.describe('validation', () => {
    test('returns 400 when `from` is missing', async ({ request }) => {
      const { from: _omit, ...payloadWithoutFrom } = VALID_PAYLOAD

      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: payloadWithoutFrom,
      })

      expect(response.status()).toBe(400)
      expect((await response.json()).error).toBeTruthy()
    })

    test('returns 400 with "Invalid sender email" when `from` is not a valid email', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: { ...VALID_PAYLOAD, from: 'not-an-email' },
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body.error).toBe('Invalid sender email')
    })

    test('returns 400 when `fromName` is missing', async ({ request }) => {
      const { fromName: _omit, ...payloadWithoutFromName } = VALID_PAYLOAD

      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: payloadWithoutFromName,
      })

      expect(response.status()).toBe(400)
      expect((await response.json()).error).toBeTruthy()
    })

    test('returns 400 with "Sender name is required" when `fromName` is an empty string', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: { ...VALID_PAYLOAD, fromName: '' },
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body.error).toBe('Sender name is required')
    })

    test('returns 400 with "Sender name is required" when `fromName` is whitespace only', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: { ...VALID_PAYLOAD, fromName: '   ' },
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body.error).toBe('Sender name is required')
    })

    test('returns 400 when `subject` is missing', async ({ request }) => {
      const { subject: _omit, ...payloadWithoutSubject } = VALID_PAYLOAD

      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: payloadWithoutSubject,
      })

      expect(response.status()).toBe(400)
      expect((await response.json()).error).toBeTruthy()
    })

    test('returns 400 with "Subject is required" when `subject` is an empty string', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: { ...VALID_PAYLOAD, subject: '' },
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body.error).toBe('Subject is required')
    })

    test('returns 400 when `body` is missing', async ({ request }) => {
      const { body: _omit, ...payloadWithoutBody } = VALID_PAYLOAD

      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: payloadWithoutBody,
      })

      expect(response.status()).toBe(400)
      expect((await response.json()).error).toBeTruthy()
    })

    test('returns 400 with "Body is required" when `body` is an empty string', async ({ request }) => {
      const response = await request.post(WEBHOOK_URL, {
        headers: authHeaders(SECRET),
        data: { ...VALID_PAYLOAD, body: '' },
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body.error).toBe('Body is required')
    })
  })
})
