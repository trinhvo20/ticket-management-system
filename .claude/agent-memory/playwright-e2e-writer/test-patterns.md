---
name: test-patterns
description: Established E2E test patterns, helper conventions, and selector strategies for this project
metadata:
  type: project
---

## Login helper

Defined inline in each spec file (not a shared helper file yet — only one spec exists):

```typescript
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
```

If a second spec needs login, extract this to `e2e/helpers/auth.ts`.

## Seeded test users

- Admin: `admin@example.com` / `password123` — name "Admin", role `admin`
- Agent: `agent@example.com` / `password123` — name "Agent", role `agent`

Both seeded by `server/prisma/seed-test.ts`, which is idempotent (skips if user exists).

## Key selector findings

- **Login form email field**: `getByLabel(/email/i)` — uses `htmlFor="email"` on FieldLabel
- **Login form password field**: `getByLabel(/password/i)` — uses `htmlFor="password"` on FieldLabel
- **Submit button**: `getByRole('button', { name: /sign in/i })` — text becomes "Signing in..." while submitting
- **Validation/error messages**: `getByRole('alert')` — FieldError renders with `role="alert"` (see `field.tsx` line 215)
- **Nav sign-out**: `getByRole('button', { name: /sign out/i })` — plain button in Nav.tsx
- **Nav Users link**: `getByRole('link', { name: /users/i })` — only visible to admins
- **Dashboard heading**: `getByRole('heading', { name: 'Dashboard' })` — from Home.tsx h1
- **Users page heading**: `getByRole('heading', { name: 'Users' })` — from Users.tsx h1

## Auth behavior summary

- Login: react-hook-form + zod. Client-side validation fires BEFORE network. `noValidate` on form means browser validation is bypassed.
- `FieldError` component uses `role="alert"` for both client-side validation errors AND server error state (`error` state var).
- After successful login, `useSession` triggers a `useEffect` in Login.tsx that calls `navigate('/', { replace: true })`.
- There is NO "redirect back to original page" logic. Always redirects to `/` after login.
- `ProtectedRoute` shows "Loading..." div while `isPending`, then redirects. No `data-testid` on this loader.
- Sign out: `authClient.signOut()` then `navigate('/login', { replace: true })` in Nav.tsx.

## Intercepting network calls for timing tests

Use `page.route('**/api/auth/**', ...)` to delay responses and observe intermediate states (e.g., disabled button during submission).

## No shared-state concerns

Each test uses a fresh browser context (Playwright default with `fullyParallel: true`). Sessions don't leak between tests.

## Users page selectors (e2e/users.spec.ts)

- **Add User button**: `getByRole('button', { name: 'Add User' })` — exact string, no regex needed
- **Add user form heading**: `getByText('Add new user')` — CardTitle inside AddUserForm
- **Create user submit**: `getByRole('button', { name: 'Create user' })`
- **Cancel form**: `getByRole('button', { name: 'Cancel' })`
- **Name field (add form)**: `getByLabel('Name')` — `htmlFor="name"` in AddUserForm
- **Email field (add form)**: `getByLabel('Email')` — `htmlFor="email"` in AddUserForm
- **Password field (add form)**: `getByLabel('Password')` — `htmlFor="password"` in AddUserForm
- **Role select (add form)**: `getByLabel('Role').selectOption('admin' | 'agent')` — native `<select>` with id="role"
- **Table rows**: `getByRole('row').filter({ hasText: 'email@example.com' })` to target a specific user's row
- **Table cells**: `getByRole('cell', { name: 'text' })` — works for name and email columns
- **Edit button (per-row)**: `row.getByRole('button', { name: 'Edit user' })` — aria-label in UserTable
- **Delete button (per-row)**: `row.getByRole('button', { name: 'Delete user' })` — aria-label, disabled for self/admins
- **Edit dialog**: `getByRole('dialog', { name: 'Edit user' })` — DialogTitle is "Edit user"
- **Name field (edit dialog)**: `getByLabel('Name')` — `htmlFor="edit-name"` in EditUserDialog
- **Email field (edit dialog)**: `getByLabel('Email')` — `htmlFor="edit-email"` in EditUserDialog
- **Role select (edit dialog)**: `getByLabel('Role').selectOption(...)` — native `<select>` id="edit-role", disabled for self
- **Save changes**: `getByRole('button', { name: 'Save changes' })`
- **Delete dialog**: `getByRole('dialog', { name: 'Delete user' })` — DialogTitle is "Delete user"
- **Delete confirm button**: `dialog.getByRole('button', { name: 'Delete' })` — scoped to the dialog

## Users page test patterns

- Scope role button lookups to a row: `page.getByRole('row').filter({ hasText: email })` then `.getByRole('button', ...)`. Avoids ambiguity when multiple rows are present.
- When creating a throwaway user in delete tests, wait for the new row to appear (`expect(cell).toBeVisible()`) before opening the delete dialog — don't rely on timing alone.
- Unique test data: use `Date.now()` suffix for names and emails to avoid inter-test collisions when tests run in parallel.
- Helper `loginAsAdminAndGoToUsers` navigates to `/users` and asserts the heading to confirm the page loaded before each test body runs.

## Login helper convention for multi-spec projects

As of the third spec file (`tickets.spec.ts`), `loginAs` is still duplicated per file. If a fourth spec needs it, extract to `e2e/helpers/auth.ts` and import from there.

## Tickets page selectors (e2e/tickets.spec.ts)

- **Tickets page heading**: `getByRole('heading', { name: 'Tickets' })` — from Tickets.tsx h1
- **Tickets nav link**: `getByRole('link', { name: 'Tickets' })` — visible to BOTH admin and agent roles (not admin-gated)
- **Table rows**: `getByRole('row').filter({ hasText: subject })` to target a row by unique subject text
- **Sender name in row**: `ticketRow.getByText(fromName)` — rendered in the "From" cell as a `<div>` inside the cell

## Row position / ordering assertion

To assert that one table row appears above another without relying on row indices (which shift as other tests create tickets):

```typescript
const firstRowY = (await firstRow.boundingBox())!.y
const secondRowY = (await secondRow.boundingBox())!.y
expect(secondRowY).toBeLessThan(firstRowY)
```

Use `.boundingBox()` rather than DOM position APIs — it works correctly in Playwright's browser context and doesn't require `evaluate()`.

## Webhook helper for ticket creation in E2E tests

```typescript
async function createTicketViaWebhook(
  request: APIRequestContext,
  subject: string,
  fromName = 'E2E Tester',
) {
  const response = await request.post(`${SERVER_URL}/api/webhooks/email`, {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: { from: 'tester@example.com', fromName, subject, body: 'Test body' },
  })
  if (!response.ok()) {
    throw new Error(`Webhook POST failed: ${response.status()} ${await response.text()}`)
  }
}
```

- `SERVER_URL = process.env.SERVER_URL` and `SECRET = process.env.EMAIL_WEBHOOK_SECRET` are populated from `server/.env.test` by `playwright.config.ts` via dotenv.
- The `request` fixture comes from the test function signature alongside `page`.

## API-only (request fixture) tests — webhook spec

For pure API tests (no browser), use the `request` fixture instead of `page`. Key differences:
- `baseURL` in `playwright.config.ts` points at the **client** (`http://localhost:5174`), not the server. Always use an absolute URL for API calls: `const WEBHOOK_URL = 'http://localhost:3099/api/webhooks/email'`.
- `playwright.config.ts` loads `server/.env.test` via dotenv at config-eval time, so `process.env.EMAIL_WEBHOOK_SECRET` is available in spec files as a constant (no need to hard-code the secret value).
- Pattern: `const SECRET = process.env.EMAIL_WEBHOOK_SECRET ?? 'dev-webhook-secret'`
- Pattern for auth header helper: `function authHeaders(token: string) { return { Authorization: \`Bearer \${token}\` } }`
- Destructure-to-omit pattern for missing-field tests: `const { fieldName: _omit, ...rest } = VALID_PAYLOAD`

## Webhook endpoint details

- Route: `POST /api/webhooks/email` → `webhooksRouter` mounted at `/api/webhooks/email` in `server/src/index.ts`
- Auth middleware (`server/src/middleware/webhook.ts`): requires `Authorization: Bearer <token>` matching `EMAIL_WEBHOOK_SECRET`; missing/wrong header → `401 { error: 'Unauthorized' }`
- Validation: uses `parseBody(inboundEmailSchema, req.body, res)` from `server/src/lib/parse-body.ts`; invalid → `400 { error: issues[0].message }`
- Success: `201 { id: number, status: 'open' }` — id is the auto-incremented Ticket PK
- Ticket table is NOT wiped between test runs (only users table is wiped). Tests should not assume specific ticket IDs.
- `EMAIL_WEBHOOK_SECRET` value in `server/.env.test` is `dev-webhook-secret`
