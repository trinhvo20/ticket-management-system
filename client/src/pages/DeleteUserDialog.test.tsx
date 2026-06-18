import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { renderWithQuery } from '../test/render-with-query'
import { DeleteUserDialog } from './DeleteUserDialog'
import type { User } from '../lib/api'

const AGENT_USER: User = {
  id: 'agent-1',
  name: 'Jane',
  email: 'jane@example.com',
  role: 'agent',
  createdAt: '2024-01-02T00:00:00.000Z',
}

function renderDialog(
  user: User | null,
  {
    isPending = false,
    error = undefined as string | undefined,
    onClose = vi.fn(),
    onConfirm = vi.fn(),
  } = {}
) {
  return renderWithQuery(
    <DeleteUserDialog
      user={user}
      isPending={isPending}
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

describe('DeleteUserDialog', () => {
  it('renders nothing when user is null', () => {
    renderDialog(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the dialog with the user name when user is set', () => {
    renderDialog(AGENT_USER)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/jane/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    renderDialog(AGENT_USER, { onClose })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when Delete is clicked', async () => {
    const onConfirm = vi.fn()
    renderDialog(AGENT_USER, { onConfirm })
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('shows "Deleting..." and disables both buttons when isPending', () => {
    renderDialog(AGENT_USER, { isPending: true })
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  it('displays the error message when error is provided', () => {
    renderDialog(AGENT_USER, { error: 'Something went wrong' })
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
