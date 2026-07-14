import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { TicketDetail } from './TicketDetail'
import { getTicket, getAgents, assignTicket } from '../lib/api'

// ---------------------------------------------------------------------------
// Radix UI Select requires these to work in jsdom
// ---------------------------------------------------------------------------

beforeAll(() => {
  window.PointerEvent = MouseEvent as any
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  useParams: () => ({ id: '1' }),
}))

vi.mock('../lib/api', () => ({
  getTicket: vi.fn(),
  getAgents: vi.fn(),
  assignTicket: vi.fn(),
  ticketKeys: { detail: (id: number) => ['tickets', 'detail', id] },
  agentKeys: { all: ['agents'] },
  queryClient: { invalidateQueries: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TICKET_UNASSIGNED = {
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

const TICKET_ASSIGNED = {
  ...TICKET_UNASSIGNED,
  assignedToId: 'agent-1',
  assignedTo: { id: 'agent-1', name: 'Bob' },
}

const AGENTS = [
  { id: 'agent-1', name: 'Bob' },
  { id: 'agent-2', name: 'Carol' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDetail() {
  return renderWithQuery(<TicketDetail />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TicketDetail', () => {
  beforeEach(() => {
    vi.mocked(getTicket).mockResolvedValue(TICKET_UNASSIGNED)
    vi.mocked(getAgents).mockResolvedValue(AGENTS)
    vi.mocked(assignTicket).mockResolvedValue(undefined)
  })

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('loading state', () => {
    it('renders skeleton while ticket is loading', () => {
      vi.mocked(getTicket).mockReturnValue(new Promise(() => {}))
      renderDetail()
      expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Ticket display
  // -------------------------------------------------------------------------

  describe('ticket display', () => {
    it('shows the ticket subject', async () => {
      renderDetail()
      expect(await screen.findByText('Login is broken')).toBeInTheDocument()
    })

    it('shows the status badge', async () => {
      renderDetail()
      expect(await screen.findByText('open')).toBeInTheDocument()
    })

    it('shows sender name and email', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    it('shows the formatted category', async () => {
      renderDetail()
      expect(await screen.findByText('Technical Question')).toBeInTheDocument()
    })

    it('shows the message body', async () => {
      renderDetail()
      expect(await screen.findByText('I cannot log in since this morning.')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Assign dropdown — display
  // -------------------------------------------------------------------------

  describe('assign dropdown display', () => {
    it('shows "Unassigned" in the trigger when no agent is assigned', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      expect(screen.getByRole('combobox')).toHaveTextContent('Unassigned')
    })

    it('shows the assigned agent name in the trigger', async () => {
      vi.mocked(getTicket).mockResolvedValue(TICKET_ASSIGNED)
      renderDetail()
      await screen.findByText('Login is broken')
      expect(screen.getByRole('combobox')).toHaveTextContent('Bob')
    })
  })

  // -------------------------------------------------------------------------
  // Assign dropdown — interaction
  // -------------------------------------------------------------------------

  describe('assign dropdown interaction', () => {
    it('lists all agents and an Unassigned option when opened', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      await userEvent.click(screen.getByRole('combobox'))
      expect(await screen.findByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Carol' })).toBeInTheDocument()
    })

    it('calls assignTicket with the agent id when an agent is selected', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      await userEvent.click(screen.getByRole('combobox'))
      await userEvent.click(await screen.findByRole('option', { name: 'Bob' }))
      await waitFor(() =>
        expect(assignTicket).toHaveBeenCalledWith(1, 'agent-1')
      )
    })

    it('calls assignTicket with null when Unassigned is selected', async () => {
      vi.mocked(getTicket).mockResolvedValue(TICKET_ASSIGNED)
      renderDetail()
      await screen.findByText('Login is broken')
      await userEvent.click(screen.getByRole('combobox'))
      await userEvent.click(await screen.findByRole('option', { name: 'Unassigned' }))
      await waitFor(() =>
        expect(assignTicket).toHaveBeenCalledWith(1, null)
      )
    })

    it('invalidates the ticket query after a successful assignment', async () => {
      const { queryClient } = await import('../lib/api')
      renderDetail()
      await screen.findByText('Login is broken')
      await userEvent.click(screen.getByRole('combobox'))
      await userEvent.click(await screen.findByRole('option', { name: 'Bob' }))
      await waitFor(() =>
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['tickets', 'detail', 1],
        })
      )
    })
  })
})
