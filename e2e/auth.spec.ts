import { test, expect, type Page } from '@playwright/test'

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

// ---------------------------------------------------------------------------
// Authentication Tests
// ---------------------------------------------------------------------------

test.describe('Authentication', () => {
  // -------------------------------------------------------------------------
  // Successful login
  // -------------------------------------------------------------------------

  test.describe('successful login', () => {
    test('admin can sign in and lands on the dashboard', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel(/email/i).fill('admin@example.com')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page).toHaveURL('/')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    })

    test('agent can sign in and lands on the dashboard', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel(/email/i).fill('agent@example.com')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page).toHaveURL('/')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    })

    test('dashboard greets admin by name after login', async ({ page }) => {
      await loginAs(page, 'admin')
      await expect(page.getByText(/welcome back, admin/i)).toBeVisible()
    })

    test('dashboard greets agent by name after login', async ({ page }) => {
      await loginAs(page, 'agent')
      await expect(page.getByText(/welcome back, agent/i)).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // Failed login — server-side rejection
  // -------------------------------------------------------------------------

  test.describe('failed login', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('shows an error for a wrong password', async ({ page }) => {
      await page.getByLabel(/email/i).fill('admin@example.com')
      await page.getByLabel(/password/i).fill('wrongpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page).toHaveURL('/login')
    })

    test('shows an error for an email that does not exist', async ({ page }) => {
      await page.getByLabel(/email/i).fill('nobody@example.com')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page).toHaveURL('/login')
    })

    test('does not navigate away from /login after a failed attempt', async ({ page }) => {
      await page.getByLabel(/email/i).fill('admin@example.com')
      await page.getByLabel(/password/i).fill('badpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page).toHaveURL('/login')
    })
  })

  // -------------------------------------------------------------------------
  // Client-side form validation (Zod — fires before network request)
  // -------------------------------------------------------------------------

  test.describe('form validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('shows a validation error when email is empty', async ({ page }) => {
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page).toHaveURL('/login')
    })

    test('shows a validation error when password is empty', async ({ page }) => {
      await page.getByLabel(/email/i).fill('admin@example.com')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page).toHaveURL('/login')
    })

    test('shows a validation error when both fields are empty', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click()

      // Expect at least one alert for the empty fields
      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(page).toHaveURL('/login')
    })

    test('shows a validation error for an invalid email format', async ({ page }) => {
      await page.getByLabel(/email/i).fill('not-an-email')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page).toHaveURL('/login')
    })

    test('email validation error message tells the user to enter a valid email', async ({ page }) => {
      await page.getByLabel(/email/i).fill('not-an-email')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toContainText(/valid email/i)
    })

    test('password validation error message tells the user the password is required', async ({ page }) => {
      await page.getByLabel(/email/i).fill('admin@example.com')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('alert')).toContainText(/password is required/i)
    })
  })

  // -------------------------------------------------------------------------
  // Submit button state during submission
  // -------------------------------------------------------------------------

  test.describe('submit button states', () => {
    test('button is disabled and shows "Signing in..." while the request is in flight', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel(/email/i).fill('admin@example.com')
      await page.getByLabel(/password/i).fill('password123')

      // Delay the auth response so we can observe the intermediate button state
      await page.route('**/api/auth/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        await route.continue()
      })

      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })
  })

  // -------------------------------------------------------------------------
  // Protected routes — unauthenticated access
  // -------------------------------------------------------------------------

  test.describe('unauthenticated access', () => {
    test('visiting / redirects to /login when not signed in', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveURL('/login')
    })

    test('visiting /users redirects to /login when not signed in', async ({ page }) => {
      await page.goto('/users')
      await expect(page).toHaveURL('/login')
    })
  })

  // -------------------------------------------------------------------------
  // Already-authenticated access to /login
  // -------------------------------------------------------------------------

  test.describe('authenticated user visiting /login', () => {
    test('redirects to / when already signed in as admin', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.goto('/login')
      await expect(page).toHaveURL('/')
    })

    test('redirects to / when already signed in as agent', async ({ page }) => {
      await loginAs(page, 'agent')
      await page.goto('/login')
      await expect(page).toHaveURL('/')
    })
  })

  // -------------------------------------------------------------------------
  // Role-based access — admin-only routes
  // -------------------------------------------------------------------------

  test.describe('admin-only routes', () => {
    test('admin can access /users', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.goto('/users')
      await expect(page).toHaveURL('/users')
      await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    })

    test('agent is redirected from /users to /', async ({ page }) => {
      await loginAs(page, 'agent')
      await page.goto('/users')
      await expect(page).toHaveURL('/')
    })
  })

  // -------------------------------------------------------------------------
  // Navigation — role-conditional links
  // -------------------------------------------------------------------------

  test.describe('navigation links', () => {
    test('admin sees a "Users" link in the nav', async ({ page }) => {
      await loginAs(page, 'admin')
      await expect(page.getByRole('link', { name: /users/i })).toBeVisible()
    })

    test('agent does not see a "Users" link in the nav', async ({ page }) => {
      await loginAs(page, 'agent')
      await expect(page.getByRole('link', { name: /users/i })).not.toBeVisible()
    })

    test('admin can navigate to /users via the nav link', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.getByRole('link', { name: /users/i }).click()
      await expect(page).toHaveURL('/users')
      await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // Sign out
  // -------------------------------------------------------------------------

  test.describe('sign out', () => {
    test('admin is redirected to /login after signing out', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.getByRole('button', { name: /sign out/i }).click()
      await expect(page).toHaveURL('/login')
    })

    test('agent is redirected to /login after signing out', async ({ page }) => {
      await loginAs(page, 'agent')
      await page.getByRole('button', { name: /sign out/i }).click()
      await expect(page).toHaveURL('/login')
    })

    test('session is cleared after sign out — visiting / redirects to /login', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.getByRole('button', { name: /sign out/i }).click()
      await expect(page).toHaveURL('/login')

      // Navigate directly to a protected route; should be rejected now
      await page.goto('/')
      await expect(page).toHaveURL('/login')
    })

    test('sign out is accessible from the Users page (admin)', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.goto('/users')
      await page.getByRole('button', { name: /sign out/i }).click()
      await expect(page).toHaveURL('/login')
    })
  })

  // -------------------------------------------------------------------------
  // Session persistence across page refresh
  // -------------------------------------------------------------------------

  test.describe('session persistence', () => {
    test('admin session survives a full page reload', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.reload()
      await expect(page).toHaveURL('/')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    })

    test('agent session survives a full page reload', async ({ page }) => {
      await loginAs(page, 'agent')
      await page.reload()
      await expect(page).toHaveURL('/')
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    })

    test('admin session persists to a new navigation after reload', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.reload()
      // Admin link should still be present after reload, confirming role is preserved
      await expect(page.getByRole('link', { name: /users/i })).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // Nav displays the signed-in user's name
  // -------------------------------------------------------------------------

  test.describe('nav user identity', () => {
    test('nav shows the admin user name', async ({ page }) => {
      await loginAs(page, 'admin')
      await expect(page.getByRole('navigation').getByText('Admin', { exact: true })).toBeVisible()
    })

    test('nav shows the agent user name', async ({ page }) => {
      await loginAs(page, 'agent')
      await expect(page.getByRole('navigation').getByText('Agent', { exact: true })).toBeVisible()
    })
  })
})
