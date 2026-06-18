import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithQuery } from '../test/render-with-query'
import { EditUserDialog } from './EditUserDialog'
import { updateUser, type User } from '../lib/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../lib/api', () => ({
  updateUser: vi.fn(),
  userKeys: { all: ['users'] },
  queryClient: { invalidateQueries: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AGENT_USER = {
  id: 'agent-1',
  name: 'Jane',
  email: 'jane@example.com',
  role: 'agent' as const,
  createdAt: '2024-01-02T00:00:00.000Z',
}

const ADMIN_USER = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(
  user: User | null,
  { currentUserId = 'admin-1', onClose = vi.fn(), onSuccess = vi.fn() } = {}
) {
  return renderWithQuery(
    <EditUserDialog
      user={user}
      currentUserId={currentUserId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EditUserDialog', () => {
  beforeEach(() => {
    vi.mocked(updateUser).mockResolvedValue(AGENT_USER)
  })

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------

  it('is not rendered when user is null', () => {
    renderDialog(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is visible when a user is provided', () => {
    renderDialog(AGENT_USER)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Pre-population
  // -------------------------------------------------------------------------

  it('pre-fills name, email and role from the user prop', () => {
    renderDialog(AGENT_USER)
    expect(screen.getByLabelText('Name')).toHaveValue('Jane')
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com')
    expect(screen.getByLabelText('Role')).toHaveValue('agent')
  })

  it('leaves the password field blank', () => {
    renderDialog(AGENT_USER)
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  it('shows an error when name is cleared and form is submitted', async () => {
    renderDialog(AGENT_USER)
    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it('shows an error when password is too short (non-empty)', async () => {
    renderDialog(AGENT_USER)
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('accepts a blank password (no-change) without validation error', async () => {
    renderDialog(AGENT_USER)
    // password is already blank — submit immediately
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Submission
  // -------------------------------------------------------------------------

  it('calls updateUser without password when password is left blank', async () => {
    renderDialog(AGENT_USER)
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(
        'agent-1',
        expect.objectContaining({ password: undefined }),
      )
    )
  })

  it('calls updateUser with the new password when one is provided', async () => {
    renderDialog(AGENT_USER)
    await userEvent.type(screen.getByLabelText('Password'), 'newpassword')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith(
        'agent-1',
        expect.objectContaining({ password: 'newpassword' }),
      )
    )
  })

  it('calls onSuccess and invalidates query after a successful save', async () => {
    const onSuccess = vi.fn()
    const { queryClient } = await import('../lib/api')
    renderDialog(AGENT_USER, { onSuccess })
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(queryClient.invalidateQueries).toHaveBeenCalled()
  })

  it('shows a server error in the dialog when updateUser rejects', async () => {
    vi.mocked(updateUser).mockRejectedValue(new Error('A user with that email already exists'))
    renderDialog(AGENT_USER)
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/a user with that email already exists/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Self-edit guard
  // -------------------------------------------------------------------------

  it('disables the role select when editing own account', () => {
    renderDialog(ADMIN_USER, { currentUserId: 'admin-1' })
    expect(screen.getByLabelText('Role')).toBeDisabled()
  })

  it('enables the role select when editing another user', () => {
    renderDialog(AGENT_USER, { currentUserId: 'admin-1' })
    expect(screen.getByLabelText('Role')).not.toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    renderDialog(AGENT_USER, { onClose })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
