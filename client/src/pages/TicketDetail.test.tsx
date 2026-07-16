import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { TicketDetail } from './TicketDetail'
import { getTicket, getAgents, updateTicket, getReplies, createReply } from '../lib/api'

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
  updateTicket: vi.fn(),
  getReplies: vi.fn(),
  createReply: vi.fn(),
  ticketKeys: { detail: (id: number) => ['tickets', 'detail', id] },
  agentKeys: { all: ['agents'] },
  replyKeys: { all: (id: number) => ['tickets', id, 'replies'] },
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

const REPLY_AGENT = {
  id: 10,
  ticketId: 1,
  senderType: 'agent' as const,
  body: 'We are looking into this.',
  createdAt: '2024-06-01T12:00:00.000Z',
  author: { id: 'agent-1', name: 'Bob' },
}

const REPLY_CUSTOMER = {
  id: 11,
  ticketId: 1,
  senderType: 'customer' as const,
  body: 'Any updates?',
  createdAt: '2024-06-01T13:00:00.000Z',
  author: null,
}

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
    vi.mocked(updateTicket).mockResolvedValue(undefined)
    vi.mocked(getReplies).mockResolvedValue([])
    vi.mocked(createReply).mockResolvedValue(REPLY_AGENT)
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

    it('shows sender name and email', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })

    it('shows the message body', async () => {
      renderDetail()
      expect(await screen.findByText('I cannot log in since this morning.')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Status dropdown — display
  // -------------------------------------------------------------------------

  describe('status dropdown display', () => {
    it('shows the current status in the trigger', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      expect(combos[0]).toHaveTextContent('Open')
    })
  })

  // -------------------------------------------------------------------------
  // Status dropdown — interaction
  // -------------------------------------------------------------------------

  describe('status dropdown interaction', () => {
    it('calls updateTicket with the new status when changed', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const [statusCombo] = screen.getAllByRole('combobox')
      await userEvent.click(statusCombo)
      await userEvent.click(await screen.findByRole('option', { name: 'Resolved' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { status: TicketStatus.Resolved })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Category dropdown — display
  // -------------------------------------------------------------------------

  describe('category dropdown display', () => {
    it('shows the current category in the trigger', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      expect(combos[1]).toHaveTextContent('Technical Question')
    })

    it('shows "None" when category is null', async () => {
      vi.mocked(getTicket).mockResolvedValue({ ...TICKET_UNASSIGNED, category: null })
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      expect(combos[1]).toHaveTextContent('None')
    })
  })

  // -------------------------------------------------------------------------
  // Category dropdown — interaction
  // -------------------------------------------------------------------------

  describe('category dropdown interaction', () => {
    it('calls updateTicket with null when None is selected', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      await userEvent.click(combos[1])
      await userEvent.click(await screen.findByRole('option', { name: 'None' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { category: null })
      )
    })

    it('calls updateTicket with the new category when changed', async () => {
      vi.mocked(getTicket).mockResolvedValue({ ...TICKET_UNASSIGNED, category: null })
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      await userEvent.click(combos[1])
      await userEvent.click(await screen.findByRole('option', { name: 'Refund Request' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { category: TicketCategory.RefundRequest })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Assign dropdown — display
  // -------------------------------------------------------------------------

  describe('assign dropdown display', () => {
    it('shows "Unassigned" in the trigger when no agent is assigned', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      expect(combos[2]).toHaveTextContent('Unassigned')
    })

    it('shows the assigned agent name in the trigger', async () => {
      vi.mocked(getTicket).mockResolvedValue(TICKET_ASSIGNED)
      renderDetail()
      await screen.findByText('Login is broken')
      // agents load in TicketInfo after the ticket resolves, so wait for Bob to appear
      await waitFor(() => expect(screen.getAllByRole('combobox')[2]).toHaveTextContent('Bob'))
    })
  })

  // -------------------------------------------------------------------------
  // Assign dropdown — interaction
  // -------------------------------------------------------------------------

  describe('assign dropdown interaction', () => {
    it('lists all agents and an Unassigned option when opened', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      await userEvent.click(combos[2])
      expect(await screen.findByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Carol' })).toBeInTheDocument()
    })

    it('calls updateTicket with the agent id when an agent is selected', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      await userEvent.click(combos[2])
      await userEvent.click(await screen.findByRole('option', { name: 'Bob' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { assignedToId: 'agent-1' })
      )
    })

    it('calls updateTicket with null when Unassigned is selected', async () => {
      vi.mocked(getTicket).mockResolvedValue(TICKET_ASSIGNED)
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      await userEvent.click(combos[2])
      await userEvent.click(await screen.findByRole('option', { name: 'Unassigned' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { assignedToId: null })
      )
    })

    it('invalidates the ticket query after a successful update', async () => {
      const { queryClient } = await import('../lib/api')
      renderDetail()
      await screen.findByText('Login is broken')
      const combos = screen.getAllByRole('combobox')
      await userEvent.click(combos[2])
      await userEvent.click(await screen.findByRole('option', { name: 'Bob' }))
      await waitFor(() =>
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['tickets', 'detail', 1],
        })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Reply thread — display
  // -------------------------------------------------------------------------

  describe('reply thread display', () => {
    it('shows "No replies yet" when there are no replies', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      expect(await screen.findByText('No replies yet.')).toBeInTheDocument()
    })

    it('renders agent reply with author name and Agent badge', async () => {
      vi.mocked(getReplies).mockResolvedValue([REPLY_AGENT])
      renderDetail()
      await screen.findByText('Login is broken')
      expect(await screen.findByText('We are looking into this.')).toBeInTheDocument()
      expect(screen.getByText('Agent')).toBeInTheDocument()
    })

    it('renders customer reply with ticket fromName and Customer badge', async () => {
      vi.mocked(getReplies).mockResolvedValue([REPLY_CUSTOMER])
      renderDetail()
      await screen.findByText('Login is broken')
      expect(await screen.findByText('Any updates?')).toBeInTheDocument()
      expect(screen.getByText('Customer')).toBeInTheDocument()
      // Alice is the fromName of the ticket
      expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    })

    it('renders both agent and customer replies', async () => {
      vi.mocked(getReplies).mockResolvedValue([REPLY_AGENT, REPLY_CUSTOMER])
      renderDetail()
      await screen.findByText('Login is broken')
      expect(await screen.findByText('We are looking into this.')).toBeInTheDocument()
      expect(await screen.findByText('Any updates?')).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Reply form — submit
  // -------------------------------------------------------------------------

  describe('reply form', () => {
    it('calls createReply with the typed body on submit', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      const textarea = screen.getByPlaceholderText('Write your reply…')
      await userEvent.type(textarea, 'Hello there!')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      await waitFor(() =>
        expect(createReply).toHaveBeenCalledWith(1, 'Hello there!')
      )
    })

    it('invalidates the replies query after a successful submit', async () => {
      const { queryClient } = await import('../lib/api')
      renderDetail()
      await screen.findByText('Login is broken')
      const textarea = screen.getByPlaceholderText('Write your reply…')
      await userEvent.type(textarea, 'Hello there!')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      await waitFor(() =>
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['tickets', 1, 'replies'],
        })
      )
    })

    it('shows a validation error when the body is empty', async () => {
      renderDetail()
      await screen.findByText('Login is broken')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      expect(await screen.findByText('Reply cannot be empty')).toBeInTheDocument()
    })

    it('shows a server error when createReply rejects', async () => {
      vi.mocked(createReply).mockRejectedValue(new Error('Server error'))
      renderDetail()
      await screen.findByText('Login is broken')
      const textarea = screen.getByPlaceholderText('Write your reply…')
      await userEvent.type(textarea, 'Hello there!')
      await userEvent.click(screen.getByRole('button', { name: /send reply/i }))
      expect(await screen.findByText('Server error')).toBeInTheDocument()
    })
  })
})
