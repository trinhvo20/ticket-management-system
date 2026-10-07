import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AI_AGENT_EMAIL, Role } from '@ticket/core'
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

  describe('AI agent system user', () => {
    const AI_USER = {
      id: 'ai-1',
      name: 'AI',
      email: AI_AGENT_EMAIL,
      role: Role.Agent,
      createdAt: '2024-01-04T00:00:00.000Z',
    }

    function renderWithAiUser() {
      return renderWithQuery(
        <UserTable users={[AGENT_USER, AI_USER]} isLoading={false} currentUserId="admin-1" />
      )
    }

    it('shows a System badge on the AI user row', () => {
      renderWithAiUser()
      const aiRow = screen.getByRole('row', { name: /ai@system\.local/i })
      expect(within(aiRow).getByText('System')).toBeInTheDocument()
    })

    it('hides the edit and delete buttons on the AI user row', () => {
      renderWithAiUser()
      const aiRow = screen.getByRole('row', { name: /ai@system\.local/i })
      expect(within(aiRow).queryByRole('button', { name: /edit user/i })).not.toBeInTheDocument()
      expect(within(aiRow).queryByRole('button', { name: /delete user/i })).not.toBeInTheDocument()
    })

    it('keeps the edit and delete buttons and no badge on regular user rows', () => {
      renderWithAiUser()
      const janeRow = screen.getByRole('row', { name: /jane@example\.com/i })
      expect(within(janeRow).getByRole('button', { name: /edit user/i })).toBeInTheDocument()
      expect(within(janeRow).getByRole('button', { name: /delete user/i })).toBeInTheDocument()
      expect(within(janeRow).queryByText('System')).not.toBeInTheDocument()
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
