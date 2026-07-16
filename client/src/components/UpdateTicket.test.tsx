import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { UpdateTicket } from './UpdateTicket'
import { getAgents, updateTicket } from '../lib/api'

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

vi.mock('../lib/api', () => ({
  getAgents: vi.fn(),
  updateTicket: vi.fn(),
  ticketKeys: { detail: (id: number) => ['tickets', 'detail', id] },
  agentKeys: { all: ['agents'] },
  queryClient: { invalidateQueries: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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
  createdAt: '2024-06-01T10:00:00.000Z',
  updatedAt: '2024-06-01T11:00:00.000Z',
}

const TICKET_ASSIGNED = {
  ...TICKET,
  assignedToId: 'agent-1',
  assignedTo: { id: 'agent-1', name: 'Bob' },
}

const AGENTS = [
  { id: 'agent-1', name: 'Bob' },
  { id: 'agent-2', name: 'Carol' },
]

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.mocked(getAgents).mockResolvedValue(AGENTS)
  vi.mocked(updateTicket).mockResolvedValue(undefined)
})

function render(ticket = TICKET) {
  return renderWithQuery(<UpdateTicket ticket={ticket} />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdateTicket', () => {
  // -------------------------------------------------------------------------
  // Status dropdown
  // -------------------------------------------------------------------------

  describe('status dropdown', () => {
    it('shows the current status in the trigger', () => {
      render()
      expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Open')
    })

    it('calls updateTicket with the new status when changed', async () => {
      render()
      await userEvent.click(screen.getAllByRole('combobox')[0])
      await userEvent.click(await screen.findByRole('option', { name: 'Resolved' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { status: TicketStatus.Resolved })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Category dropdown
  // -------------------------------------------------------------------------

  describe('category dropdown', () => {
    it('shows the current category in the trigger', () => {
      render()
      expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('Technical Question')
    })

    it('shows "None" when category is null', () => {
      render({ ...TICKET, category: null })
      expect(screen.getAllByRole('combobox')[1]).toHaveTextContent('None')
    })

    it('calls updateTicket with null when None is selected', async () => {
      render()
      await userEvent.click(screen.getAllByRole('combobox')[1])
      await userEvent.click(await screen.findByRole('option', { name: 'None' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { category: null })
      )
    })

    it('calls updateTicket with the new category when changed', async () => {
      render({ ...TICKET, category: null })
      await userEvent.click(screen.getAllByRole('combobox')[1])
      await userEvent.click(await screen.findByRole('option', { name: 'Refund Request' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { category: TicketCategory.RefundRequest })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Assign dropdown
  // -------------------------------------------------------------------------

  describe('assign dropdown', () => {
    it('shows "Unassigned" in the trigger when no agent is assigned', () => {
      render()
      expect(screen.getAllByRole('combobox')[2]).toHaveTextContent('Unassigned')
    })

    it('shows the assigned agent name in the trigger', async () => {
      render(TICKET_ASSIGNED)
      await waitFor(() =>
        expect(screen.getAllByRole('combobox')[2]).toHaveTextContent('Bob')
      )
    })

    it('lists all agents and an Unassigned option when opened', async () => {
      render()
      await userEvent.click(screen.getAllByRole('combobox')[2])
      expect(await screen.findByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Carol' })).toBeInTheDocument()
    })

    it('calls updateTicket with the agent id when an agent is selected', async () => {
      render()
      await userEvent.click(screen.getAllByRole('combobox')[2])
      await userEvent.click(await screen.findByRole('option', { name: 'Bob' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { assignedToId: 'agent-1' })
      )
    })

    it('calls updateTicket with null when Unassigned is selected', async () => {
      render(TICKET_ASSIGNED)
      await userEvent.click(screen.getAllByRole('combobox')[2])
      await userEvent.click(await screen.findByRole('option', { name: 'Unassigned' }))
      await waitFor(() =>
        expect(updateTicket).toHaveBeenCalledWith(1, { assignedToId: null })
      )
    })

    it('invalidates the ticket query after a successful update', async () => {
      const { queryClient } = await import('../lib/api')
      render()
      await userEvent.click(screen.getAllByRole('combobox')[2])
      await userEvent.click(await screen.findByRole('option', { name: 'Bob' }))
      await waitFor(() =>
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['tickets', 'detail', 1],
        })
      )
    })
  })
})
