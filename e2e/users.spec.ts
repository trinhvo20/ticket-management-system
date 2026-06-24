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

async function loginAsAdminAndGoToUsers(page: Page) {
  await loginAs(page, 'admin')
  await page.goto('/users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
}

// ---------------------------------------------------------------------------
// User management Tests
// ---------------------------------------------------------------------------

test.describe('User management', () => {
  // -------------------------------------------------------------------------
  // Create — add user
  // -------------------------------------------------------------------------

  test.describe('create — add user', () => {
    test('admin can open the Add User form by clicking the Add User button', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      await page.getByRole('button', { name: 'Add User' }).click()

      // Form heading appears; the Add User button is replaced by the form
      await expect(page.getByText('Add new user')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Add User' })).not.toBeVisible()
    })

    test('admin can cancel the Add User form without creating a user', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      await page.getByRole('button', { name: 'Add User' }).click()
      await expect(page.getByText('Add new user')).toBeVisible()

      await page.getByRole('button', { name: 'Cancel' }).click()

      // Form is gone and the Add User button is back
      await expect(page.getByText('Add new user')).not.toBeVisible()
      await expect(page.getByRole('button', { name: 'Add User' })).toBeVisible()
    })

    test('admin can create a new agent user and see them in the table', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      const uniqueEmail = `newagent-${Date.now()}@example.com`
      const uniqueName = `New Agent ${Date.now()}`

      await page.getByRole('button', { name: 'Add User' }).click()

      await page.getByLabel('Name').fill(uniqueName)
      await page.getByLabel('Email').fill(uniqueEmail)
      await page.getByLabel('Password').fill('password123')
      // Role defaults to Agent — no change needed

      await page.getByRole('button', { name: 'Create user' }).click()

      // Form collapses on success and new user appears in the table
      await expect(page.getByText('Add new user')).not.toBeVisible()
      await expect(page.getByRole('cell', { name: uniqueName })).toBeVisible()
      await expect(page.getByRole('cell', { name: uniqueEmail })).toBeVisible()
    })

    test('admin can create a new admin user and see them in the table', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      const uniqueEmail = `newadmin-${Date.now()}@example.com`
      const uniqueName = `New Admin ${Date.now()}`

      await page.getByRole('button', { name: 'Add User' }).click()

      await page.getByLabel('Name').fill(uniqueName)
      await page.getByLabel('Email').fill(uniqueEmail)
      await page.getByLabel('Password').fill('password123')
      await page.getByLabel('Role').selectOption('admin')

      await page.getByRole('button', { name: 'Create user' }).click()

      await expect(page.getByText('Add new user')).not.toBeVisible()
      await expect(page.getByRole('cell', { name: uniqueName })).toBeVisible()
      await expect(page.getByRole('cell', { name: uniqueEmail })).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // Update — edit user
  // -------------------------------------------------------------------------

  test.describe('update — edit user', () => {
    test("admin can edit a user's name and see it updated in the table", async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      // Create a throwaway user so the seeded users are never mutated
      const originalEmail = `edit-name-${Date.now()}@example.com`
      const originalName = `Edit Name ${Date.now()}`
      const updatedName = `Updated Name ${Date.now()}`

      await page.getByRole('button', { name: 'Add User' }).click()
      await page.getByLabel('Name').fill(originalName)
      await page.getByLabel('Email').fill(originalEmail)
      await page.getByLabel('Password').fill('password123')
      await page.getByRole('button', { name: 'Create user' }).click()
      await expect(page.getByRole('cell', { name: originalName })).toBeVisible()

      const userRow = page.getByRole('row').filter({ hasText: originalEmail })
      await userRow.getByRole('button', { name: 'Edit user' }).click()

      await expect(page.getByRole('dialog', { name: 'Edit user' })).toBeVisible()

      const nameInput = page.getByLabel('Name')
      await nameInput.clear()
      await nameInput.fill(updatedName)

      await page.getByRole('button', { name: 'Save changes' }).click()

      await expect(page.getByRole('dialog', { name: 'Edit user' })).not.toBeVisible()
      await expect(page.getByRole('cell', { name: updatedName })).toBeVisible()
    })

    test("admin can edit a user's email and see it updated in the table", async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      const originalEmail = `edit-email-${Date.now()}@example.com`
      const originalName = `Edit Email ${Date.now()}`
      const updatedEmail = `edit-email-updated-${Date.now()}@example.com`

      await page.getByRole('button', { name: 'Add User' }).click()
      await page.getByLabel('Name').fill(originalName)
      await page.getByLabel('Email').fill(originalEmail)
      await page.getByLabel('Password').fill('password123')
      await page.getByRole('button', { name: 'Create user' }).click()
      await expect(page.getByRole('cell', { name: originalName })).toBeVisible()

      const userRow = page.getByRole('row').filter({ hasText: originalEmail })
      await userRow.getByRole('button', { name: 'Edit user' }).click()

      await expect(page.getByRole('dialog', { name: 'Edit user' })).toBeVisible()

      const emailInput = page.getByLabel('Email')
      await emailInput.clear()
      await emailInput.fill(updatedEmail)

      await page.getByRole('button', { name: 'Save changes' }).click()

      await expect(page.getByRole('dialog', { name: 'Edit user' })).not.toBeVisible()
      await expect(page.getByRole('cell', { name: updatedEmail })).toBeVisible()
    })

    test('admin can cancel editing a user without saving changes', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      const originalEmail = `cancel-edit-${Date.now()}@example.com`
      const originalName = `Cancel Edit ${Date.now()}`

      await page.getByRole('button', { name: 'Add User' }).click()
      await page.getByLabel('Name').fill(originalName)
      await page.getByLabel('Email').fill(originalEmail)
      await page.getByLabel('Password').fill('password123')
      await page.getByRole('button', { name: 'Create user' }).click()
      await expect(page.getByRole('cell', { name: originalName })).toBeVisible()

      const userRow = page.getByRole('row').filter({ hasText: originalEmail })
      await userRow.getByRole('button', { name: 'Edit user' }).click()

      await expect(page.getByRole('dialog', { name: 'Edit user' })).toBeVisible()

      const nameInput = page.getByLabel('Name')
      await nameInput.clear()
      await nameInput.fill('Should Not Be Saved')

      await page.getByRole('button', { name: 'Cancel' }).click()

      // Dialog closes; original name is still shown
      await expect(page.getByRole('dialog', { name: 'Edit user' })).not.toBeVisible()
      await expect(userRow.getByRole('cell', { name: originalName, exact: true })).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // Delete — remove user
  // -------------------------------------------------------------------------

  test.describe('delete — remove user', () => {
    test('admin can delete a throwaway agent user and they are removed from the table', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      // Step 1: create a throwaway user to delete
      const throwawayEmail = `throwaway-${Date.now()}@example.com`
      const throwawayName = `Throwaway ${Date.now()}`

      await page.getByRole('button', { name: 'Add User' }).click()
      await page.getByLabel('Name').fill(throwawayName)
      await page.getByLabel('Email').fill(throwawayEmail)
      await page.getByLabel('Password').fill('password123')
      await page.getByRole('button', { name: 'Create user' }).click()

      // Wait for the new user to appear before proceeding
      await expect(page.getByRole('cell', { name: throwawayName })).toBeVisible()

      // Step 2: open the delete dialog for that user
      const throwawayRow = page.getByRole('row').filter({ hasText: throwawayEmail })
      await throwawayRow.getByRole('button', { name: 'Delete user' }).click()

      // Dialog confirms the user's name
      const dialog = page.getByRole('dialog', { name: 'Delete user' })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(throwawayName)).toBeVisible()

      // Step 3: confirm deletion
      await dialog.getByRole('button', { name: 'Delete' }).click()

      // Dialog closes and the user is no longer in the table
      await expect(dialog).not.toBeVisible()
      await expect(page.getByRole('cell', { name: throwawayName })).not.toBeVisible()
    })

    test('admin can cancel a deletion and the user remains in the table', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      // Create a throwaway user
      const throwawayEmail = `cancel-delete-${Date.now()}@example.com`
      const throwawayName = `Cancel Delete ${Date.now()}`

      await page.getByRole('button', { name: 'Add User' }).click()
      await page.getByLabel('Name').fill(throwawayName)
      await page.getByLabel('Email').fill(throwawayEmail)
      await page.getByLabel('Password').fill('password123')
      await page.getByRole('button', { name: 'Create user' }).click()

      await expect(page.getByRole('cell', { name: throwawayName })).toBeVisible()

      // Open delete dialog then cancel
      const throwawayRow = page.getByRole('row').filter({ hasText: throwawayEmail })
      await throwawayRow.getByRole('button', { name: 'Delete user' }).click()

      const dialog = page.getByRole('dialog', { name: 'Delete user' })
      await expect(dialog).toBeVisible()

      await dialog.getByRole('button', { name: 'Cancel' }).click()

      // Dialog closes but user is still present
      await expect(dialog).not.toBeVisible()
      await expect(page.getByRole('cell', { name: throwawayName })).toBeVisible()
    })

    test('delete button is disabled for the logged-in admin (cannot self-delete)', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      const adminRow = page.getByRole('row').filter({ hasText: 'admin@example.com' })
      await expect(adminRow.getByRole('button', { name: 'Delete user' })).toBeDisabled()
    })

    test('delete button is disabled for other admin users', async ({ page }) => {
      await loginAsAdminAndGoToUsers(page)

      // Create a second admin user
      const secondAdminEmail = `second-admin-${Date.now()}@example.com`
      const secondAdminName = `Second Admin ${Date.now()}`

      await page.getByRole('button', { name: 'Add User' }).click()
      await page.getByLabel('Name').fill(secondAdminName)
      await page.getByLabel('Email').fill(secondAdminEmail)
      await page.getByLabel('Password').fill('password123')
      await page.getByLabel('Role').selectOption('admin')
      await page.getByRole('button', { name: 'Create user' }).click()

      await expect(page.getByRole('cell', { name: secondAdminName })).toBeVisible()

      // Delete button for the new admin must be disabled
      const secondAdminRow = page.getByRole('row').filter({ hasText: secondAdminEmail })
      await expect(secondAdminRow.getByRole('button', { name: 'Delete user' })).toBeDisabled()
    })
  })
})
