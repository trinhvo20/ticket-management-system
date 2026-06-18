import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithQuery } from '../test/render-with-query'
import { Users } from './Users'
import { getUsers, createUser, deleteUser } from '../lib/api'
import { useSession } from '../lib/auth-client'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../lib/api', () => ({
  getUsers: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  userKeys: { all: ['users'] },
  queryClient: { invalidateQueries: vi.fn() },
}))

vi.mock('../lib/auth-client', () => ({
  useSession: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_USER = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const AGENT_USER = {
  id: 'agent-1',
  name: 'Jane',
  email: 'jane@example.com',
  role: 'agent' as const,
  createdAt: '2024-01-02T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderUsers() {
  return renderWithQuery(<Users />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Users page', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: ADMIN_USER },
      isPending: false,
    } as any)
    vi.mocked(getUsers).mockResolvedValue([ADMIN_USER, AGENT_USER])
  })

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('loading state', () => {
    it('shows the table structure without real data while fetching', () => {
      vi.mocked(getUsers).mockReturnValue(new Promise(() => {})) // never resolves
      renderUsers()
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument()
    })

    it('renders skeleton rows (not real data) during load', () => {
      vi.mocked(getUsers).mockReturnValue(new Promise(() => {}))
      renderUsers()
      // 4 skeleton rows + 1 header row = 5 total
      expect(screen.getAllByRole('row')).toHaveLength(5)
    })
  })

  // -------------------------------------------------------------------------
  // Populated table
  // -------------------------------------------------------------------------

  describe('populated table', () => {
    it('renders a row for each user after loading', async () => {
      renderUsers()
      await screen.findByText('Admin')
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    it('displays role badges for each user', async () => {
      renderUsers()
      await screen.findByText('admin')
      expect(screen.getByText('agent')).toBeInTheDocument()
    })

    it('shows an empty-state message when there are no users', async () => {
      vi.mocked(getUsers).mockResolvedValue([])
      renderUsers()
      expect(await screen.findByText(/no users found/i)).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Fetch error
  // -------------------------------------------------------------------------

  describe('fetch error', () => {
    it('shows an error message when getUsers rejects', async () => {
      vi.mocked(getUsers).mockRejectedValue(new Error('Network error'))
      renderUsers()
      expect(await screen.findByText('Network error')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  describe('delete', () => {
    it("disables the delete button on the signed-in admin's own row", async () => {
      renderUsers()
      await screen.findByText('Admin')
      const [adminDelete, agentDelete] = screen.getAllByRole('button', { name: /delete/i })
      expect(adminDelete).toBeDisabled()
      expect(agentDelete).not.toBeDisabled()
    })

    it('calls deleteUser with the correct id when delete is clicked', async () => {
      vi.mocked(deleteUser).mockResolvedValue(undefined)
      renderUsers()
      await screen.findByText('Jane')
      const [, agentDelete] = screen.getAllByRole('button', { name: /delete/i })
      await userEvent.click(agentDelete)
      expect(deleteUser).toHaveBeenCalledWith('agent-1', expect.anything())
    })
  })

  // -------------------------------------------------------------------------
  // Create form visibility
  // -------------------------------------------------------------------------

  describe('"Add User" form', () => {
    it('is hidden on initial render', async () => {
      renderUsers()
      await screen.findByText('Admin')
      expect(screen.queryByText('Add new user')).not.toBeInTheDocument()
    })

    it('appears when "Add User" is clicked', async () => {
      renderUsers()
      await screen.findByText('Admin')
      await userEvent.click(screen.getByRole('button', { name: /add user/i }))
      expect(screen.getByText('Add new user')).toBeInTheDocument()
    })

    it('hides the "Add User" button while the form is open', async () => {
      renderUsers()
      await screen.findByText('Admin')
      await userEvent.click(screen.getByRole('button', { name: /add user/i }))
      expect(screen.queryByRole('button', { name: /add user/i })).not.toBeInTheDocument()
    })

    it('closes the form when "Cancel" is clicked', async () => {
      renderUsers()
      await screen.findByText('Admin')
      await userEvent.click(screen.getByRole('button', { name: /add user/i }))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(screen.queryByText('Add new user')).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Form validation
  // -------------------------------------------------------------------------

  describe('form validation', () => {
    async function openForm() {
      await screen.findByText('Admin')
      await userEvent.click(screen.getByRole('button', { name: /add user/i }))
    }

    it('shows a validation error when name is empty', async () => {
      renderUsers()
      await openForm()
      await userEvent.click(screen.getByRole('button', { name: /create user/i }))
      expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    })

    it('shows a validation error when password is too short', async () => {
      renderUsers()
      await openForm()
      await userEvent.type(screen.getByLabelText('Name'), 'New User')
      await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
      await userEvent.type(screen.getByLabelText('Password'), 'short')
      await userEvent.click(screen.getByRole('button', { name: /create user/i }))
      expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    })

    it('shows a validation error for an invalid email format', async () => {
      renderUsers()
      await openForm()
      await userEvent.type(screen.getByLabelText('Name'), 'New User')
      await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
      await userEvent.type(screen.getByLabelText('Password'), 'password123')
      await userEvent.click(screen.getByRole('button', { name: /create user/i }))
      expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------

  describe('form submission', () => {
    async function fillAndSubmit(overrides: Record<string, string> = {}) {
      const values = {
        name: 'New Agent',
        email: 'newagent@example.com',
        password: 'password123',
        ...overrides,
      }
      await screen.findByText('Admin')
      await userEvent.click(screen.getByRole('button', { name: /add user/i }))
      await userEvent.type(screen.getByLabelText('Name'), values.name)
      await userEvent.type(screen.getByLabelText('Email'), values.email)
      await userEvent.type(screen.getByLabelText('Password'), values.password)
    }

    it('calls createUser with the correct values on valid submit', async () => {
      vi.mocked(createUser).mockResolvedValue({
        id: 'new-1',
        name: 'New Agent',
        email: 'newagent@example.com',
        role: 'agent',
        createdAt: '2024-01-03T00:00:00.000Z',
      })
      renderUsers()
      await fillAndSubmit()
      await userEvent.click(screen.getByRole('button', { name: /create user/i }))
      await waitFor(() =>
        expect(createUser).toHaveBeenCalledWith(
          { name: 'New Agent', email: 'newagent@example.com', password: 'password123', role: 'agent' },
          expect.anything(),
        ),
      )
    })

    it('closes the form after a successful submission', async () => {
      vi.mocked(createUser).mockResolvedValue({
        id: 'new-1',
        name: 'New Agent',
        email: 'newagent@example.com',
        role: 'agent',
        createdAt: '2024-01-03T00:00:00.000Z',
      })
      renderUsers()
      await fillAndSubmit()
      await userEvent.click(screen.getByRole('button', { name: /create user/i }))
      await waitFor(() =>
        expect(screen.queryByText('Add new user')).not.toBeInTheDocument(),
      )
    })

    it('shows a server error in the form when createUser rejects', async () => {
      vi.mocked(createUser).mockRejectedValue(
        new Error('A user with that email already exists'),
      )
      renderUsers()
      await fillAndSubmit()
      await userEvent.click(screen.getByRole('button', { name: /create user/i }))
      expect(
        await screen.findByText(/a user with that email already exists/i),
      ).toBeInTheDocument()
      // Form stays open so the user can correct it
      expect(screen.getByText('Add new user')).toBeInTheDocument()
    })
  })
})
