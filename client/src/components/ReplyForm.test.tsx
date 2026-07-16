import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { ReplyForm } from './ReplyForm'
import { createReply } from '../lib/api'

vi.mock('../lib/api', () => ({
  createReply: vi.fn(),
  replyKeys: { all: (id: number) => ['tickets', id, 'replies'] },
  queryClient: { invalidateQueries: vi.fn() },
}))

const TICKET = {
  id: 1,
  subject: 'Login is broken',
  fromEmail: 'alice@example.com',
  fromName: 'Alice',
  status: TicketStatus.Open,
  category: TicketCategory.TechnicalQuestion,
  assignedToId: null,
  assignedTo: null,
  body: 'I cannot log in.',
  createdAt: '2024-06-01T10:00:00.000Z',
  updatedAt: '2024-06-01T11:00:00.000Z',
}

const REPLY = {
  id: 10,
  ticketId: 1,
  senderType: 'agent' as const,
  body: 'Hello there!',
  createdAt: '2024-06-01T12:00:00.000Z',
  author: { id: 'agent-1', name: 'Bob' },
}

beforeEach(() => {
  vi.mocked(createReply).mockResolvedValue(REPLY)
})

describe('ReplyForm', () => {
  describe('rendering', () => {
    it('renders the reply textarea', () => {
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      expect(screen.getByPlaceholderText('Write your reply…')).toBeInTheDocument()
    })

    it('renders the Send Reply button', () => {
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('shows a validation error when submitting an empty body', async () => {
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      expect(await screen.findByText('Reply cannot be empty')).toBeInTheDocument()
    })

    it('does not call createReply when the body is empty', async () => {
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      await screen.findByText('Reply cannot be empty')
      expect(createReply).not.toHaveBeenCalled()
    })
  })

  describe('submission', () => {
    it('calls createReply with the ticket id and typed body', async () => {
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      await userEvent.type(screen.getByPlaceholderText('Write your reply…'), 'Hello there!')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      await waitFor(() =>
        expect(createReply).toHaveBeenCalledWith(1, 'Hello there!')
      )
    })

    it('invalidates the replies query on success', async () => {
      const { queryClient } = await import('../lib/api')
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      await userEvent.type(screen.getByPlaceholderText('Write your reply…'), 'Hello there!')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      await waitFor(() =>
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['tickets', 1, 'replies'],
        })
      )
    })

    it('clears the textarea on success', async () => {
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      const textarea = screen.getByPlaceholderText('Write your reply…')
      await userEvent.type(textarea, 'Hello there!')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      await waitFor(() => expect(textarea).toHaveValue(''))
    })
  })

  describe('server error', () => {
    it('shows the error message when createReply rejects', async () => {
      vi.mocked(createReply).mockRejectedValue(new Error('Server error'))
      renderWithQuery(<ReplyForm ticket={TICKET} />)
      await userEvent.type(screen.getByPlaceholderText('Write your reply…'), 'Hello there!')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      expect(await screen.findByText('Server error')).toBeInTheDocument()
    })
  })
})
