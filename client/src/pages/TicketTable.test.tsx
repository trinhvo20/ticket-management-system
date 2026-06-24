import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { TicketTable } from './TicketTable'
import type { Ticket } from '../lib/api'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TICKET_OPEN: Ticket = {
  id: 1,
  subject: 'Billing issue',
  fromEmail: 'alice@example.com',
  fromName: 'Alice',
  status: TicketStatus.Open,
  category: TicketCategory.GeneralQuestion,
  assignedToId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const TICKET_RESOLVED: Ticket = {
  id: 2,
  subject: 'Technical problem',
  fromEmail: 'bob@example.com',
  fromName: 'Bob',
  status: TicketStatus.Resolved,
  category: TicketCategory.TechnicalQuestion,
  assignedToId: null,
  createdAt: '2024-01-02T00:00:00.000Z',
}

const TICKET_CLOSED: Ticket = {
  id: 3,
  subject: 'Refund request',
  fromEmail: 'carol@example.com',
  fromName: 'Carol',
  status: TicketStatus.Closed,
  category: TicketCategory.RefundRequest,
  assignedToId: null,
  createdAt: '2024-01-03T00:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TicketTable', () => {
  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('loading state', () => {
    it('renders 4 skeleton rows plus a header row while loading', () => {
      renderWithQuery(<TicketTable tickets={[]} isLoading />)
      expect(screen.getAllByRole('row')).toHaveLength(5)
    })

    it('does not show ticket data while loading', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_OPEN]} isLoading />)
      expect(screen.queryByText('Billing issue')).not.toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Ticket rows
  // -------------------------------------------------------------------------

  describe('ticket rows', () => {
    it('renders a row for each ticket', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_OPEN, TICKET_RESOLVED]} isLoading={false} />)
      expect(screen.getByText('Billing issue')).toBeInTheDocument()
      expect(screen.getByText('Technical problem')).toBeInTheDocument()
    })

    it('shows the ticket id', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_OPEN]} isLoading={false} />)
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('shows sender name and email', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_OPEN]} isLoading={false} />)
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Status badge
  // -------------------------------------------------------------------------

  describe('status badge', () => {
    it('renders "open" for open tickets', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_OPEN]} isLoading={false} />)
      expect(screen.getByText('open')).toBeInTheDocument()
    })

    it('renders "resolved" for resolved tickets', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_RESOLVED]} isLoading={false} />)
      expect(screen.getByText('resolved')).toBeInTheDocument()
    })

    it('renders "closed" for closed tickets', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_CLOSED]} isLoading={false} />)
      expect(screen.getByText('closed')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Category formatting
  // -------------------------------------------------------------------------

  describe('category formatting', () => {
    it('formats general_question as "General Question"', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_OPEN]} isLoading={false} />)
      expect(screen.getByText('General Question')).toBeInTheDocument()
    })

    it('formats technical_question as "Technical Question"', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_RESOLVED]} isLoading={false} />)
      expect(screen.getByText('Technical Question')).toBeInTheDocument()
    })

    it('formats refund_request as "Refund Request"', () => {
      renderWithQuery(<TicketTable tickets={[TICKET_CLOSED]} isLoading={false} />)
      expect(screen.getByText('Refund Request')).toBeInTheDocument()
    })

    it('shows "—" when category is null', () => {
      renderWithQuery(<TicketTable tickets={[{ ...TICKET_OPEN, category: null }]} isLoading={false} />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  describe('empty state', () => {
    it('shows "No tickets yet." when the tickets array is empty', () => {
      renderWithQuery(<TicketTable tickets={[]} isLoading={false} />)
      expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument()
    })
  })
})
