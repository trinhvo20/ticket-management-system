import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { UserTable } from './UserTable'
import { deleteUser, updateUser } from '../lib/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../lib/api', () => ({
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
  userKeys: { all: ['users'] },
  queryClient: { invalidateQueries: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_USER = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  role: Role.Admin,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const ADMIN_USER_2 = {
  id: 'admin-2',
  name: 'Admin Two',
  email: 'admin2@example.com',
  role: Role.Admin,
  createdAt: '2024-01-02T00:00:00.000Z',
}

const AGENT_USER = {
  id: 'agent-1',
  name: 'Jane',
  email: 'jane@example.com',
  role: Role.Agent,
  createdAt: '2024-01-03T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTable(currentUserId = 'admin-1') {
  return renderWithQuery(
    <UserTable
      users={[ADMIN_USER, ADMIN_USER_2, AGENT_USER]}
      isLoading={false}
      currentUserId={currentUserId}
    />
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserTable', () => {
  beforeEach(() => {
    vi.mocked(deleteUser).mockResolvedValue(undefined)
    vi.mocked(updateUser).mockResolvedValue(AGENT_USER)
  })

  describe('delete button', () => {
    it('is disabled for self', () => {
      renderTable('admin-1')
      const deleteButtons = screen.getAllByRole('button', { name: /delete user/i })
      // admin-1 is self → disabled
      expect(deleteButtons[0]).toBeDisabled()
    })

    it('is disabled for admin users regardless of self', () => {
      renderTable('admin-1')
      const deleteButtons = screen.getAllByRole('button', { name: /delete user/i })
      // admin-2 is not self but is admin → disabled
      expect(deleteButtons[1]).toBeDisabled()
    })

    it('is enabled for agent users', () => {
      renderTable('admin-1')
      const deleteButtons = screen.getAllByRole('button', { name: /delete user/i })
      // agent-1 → enabled
      expect(deleteButtons[2]).not.toBeDisabled()
    })
  })

  describe('confirmation dialog', () => {
    it('opens the dialog with user name when trash is clicked', async () => {
      renderTable()
      const deleteButtons = screen.getAllByRole('button', { name: /delete user/i })
      await userEvent.click(deleteButtons[2]) // Jane's row
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(within(dialog).getByText(/jane/i)).toBeInTheDocument()
    })

    it('closes the dialog without deleting when Cancel is clicked', async () => {
      renderTable()
      const deleteButtons = screen.getAllByRole('button', { name: /delete user/i })
      await userEvent.click(deleteButtons[2])
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(deleteUser).not.toHaveBeenCalled()
    })

    it('calls deleteUser with the correct id on confirm', async () => {
      renderTable()
      const deleteButtons = screen.getAllByRole('button', { name: /delete user/i })
      await userEvent.click(deleteButtons[2]) // Jane's row
      await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
      await waitFor(() =>
        expect(deleteUser).toHaveBeenCalledWith('agent-1')
      )
    })

    it('closes the dialog after successful deletion', async () => {
      renderTable()
      const deleteButtons = screen.getAllByRole('button', { name: /delete user/i })
      await userEvent.click(deleteButtons[2])
      await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
  })
})
