import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { Tickets } from './Tickets'
import { getTickets } from '../lib/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../lib/api', () => ({
  getTickets: vi.fn(),
  getAgents: vi.fn().mockResolvedValue([]),
  ticketKeys: { all: ['tickets'], list: (_params?: unknown) => ['tickets'] },
  agentKeys: { all: ['agents'] },
  queryClient: { invalidateQueries: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TICKET_1 = {
  id: 1,
  subject: 'Billing issue',
  fromEmail: 'alice@example.com',
  fromName: 'Alice',
  status: TicketStatus.Open,
  category: TicketCategory.GeneralQuestion,
  assignedToId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const TICKET_2 = {
  id: 2,
  subject: 'Technical problem',
  fromEmail: 'bob@example.com',
  fromName: 'Bob',
  status: TicketStatus.Resolved,
  category: null,
  assignedToId: null,
  createdAt: '2024-01-02T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tickets page', () => {
  beforeEach(() => {
    vi.mocked(getTickets).mockResolvedValue({ tickets: [TICKET_1, TICKET_2], total: 2 })
  })

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('loading state', () => {
    it('shows the table structure without real data while fetching', () => {
      vi.mocked(getTickets).mockReturnValue(new Promise(() => {}))
      renderWithQuery(<Tickets />)
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.queryByText('Billing issue')).not.toBeInTheDocument()
    })

    it('renders 4 skeleton rows during load', () => {
      vi.mocked(getTickets).mockReturnValue(new Promise(() => {}))
      renderWithQuery(<Tickets />)
      // 4 skeleton rows + 1 header row = 5
      expect(screen.getAllByRole('row')).toHaveLength(5)
    })
  })

  // -------------------------------------------------------------------------
  // Populated table
  // -------------------------------------------------------------------------

  describe('populated table', () => {
    it('renders a row for each ticket after loading', async () => {
      renderWithQuery(<Tickets />)
      await screen.findByText('Billing issue')
      expect(screen.getByText('Technical problem')).toBeInTheDocument()
    })

    it('shows sender name and email', async () => {
      renderWithQuery(<Tickets />)
      await screen.findByText('Alice')
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    it('displays status badges', async () => {
      renderWithQuery(<Tickets />)
      await screen.findByText('Open')
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })

    it('formats category from snake_case to Title Case', async () => {
      renderWithQuery(<Tickets />)
      expect(await screen.findByText('General Question')).toBeInTheDocument()
    })

    it('shows "—" for tickets with no category', async () => {
      renderWithQuery(<Tickets />)
      expect(await screen.findByText('—')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  describe('empty state', () => {
    it('shows empty message when there are no tickets', async () => {
      vi.mocked(getTickets).mockResolvedValue({ tickets: [], total: 0 })
      renderWithQuery(<Tickets />)
      expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Fetch error
  // -------------------------------------------------------------------------

  describe('fetch error', () => {
    it('shows an error message when getTickets rejects', async () => {
      vi.mocked(getTickets).mockRejectedValue(new Error('Network error'))
      renderWithQuery(<Tickets />)
      expect(await screen.findByText('Network error')).toBeInTheDocument()
    })
  })
})
