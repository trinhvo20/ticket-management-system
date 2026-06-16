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
