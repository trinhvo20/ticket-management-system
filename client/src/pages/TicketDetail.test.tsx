import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { TicketDetail } from './TicketDetail'
import { getTicket } from '../lib/api'

vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  useParams: () => ({ id: '1' }),
}))

vi.mock('../lib/api', () => ({
  getTicket: vi.fn(),
  getAgents: vi.fn(),
  updateTicket: vi.fn(),
  getReplies: vi.fn(),
  createReply: vi.fn(),
  ticketKeys: { detail: (id: number) => ['tickets', 'detail', id] },
  agentKeys: { all: ['agents'] },
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
  body: 'I cannot log in since this morning.',
  bodyHtml: undefined,
  createdAt: '2024-06-01T10:00:00.000Z',
  updatedAt: '2024-06-01T11:00:00.000Z',
}

beforeEach(() => {
  vi.mocked(getTicket).mockResolvedValue(TICKET)
})

function renderDetail() {
  return renderWithQuery(<TicketDetail />)
}

describe('TicketDetail', () => {
  describe('loading state', () => {
    it('renders skeleton while ticket is loading', () => {
      vi.mocked(getTicket).mockReturnValue(new Promise(() => {}))
      renderDetail()
      expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message when the ticket fetch fails', async () => {
      vi.mocked(getTicket).mockRejectedValue(new Error('Ticket not found'))
      renderDetail()
      expect(await screen.findByText(/ticket not found/i)).toBeInTheDocument()
    })

    it('shows a back link when the ticket fetch fails', async () => {
      vi.mocked(getTicket).mockRejectedValue(new Error('Ticket not found'))
      renderDetail()
      await screen.findByText(/ticket not found/i)
      expect(screen.getByRole('link', { name: /back to tickets/i })).toBeInTheDocument()
    })
  })
})
