import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { TicketSummary } from './TicketSummary'
import { summarizeTicket } from '../lib/api'

vi.mock('../lib/api', () => ({
  summarizeTicket: vi.fn(),
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
  createdAt: '2024-06-01T10:00:00.000Z',
  updatedAt: '2024-06-01T11:00:00.000Z',
}

beforeEach(() => {
  vi.mocked(summarizeTicket).mockReset()
})

describe('TicketSummary', () => {
  it('renders the Summarize button', () => {
    renderWithQuery(<TicketSummary ticket={TICKET} />)
    expect(screen.getByRole('button', { name: /summarize/i })).toBeInTheDocument()
  })

  it('calls summarizeTicket with the ticket id when clicked', async () => {
    vi.mocked(summarizeTicket).mockResolvedValue('A short summary.')
    renderWithQuery(<TicketSummary ticket={TICKET} />)
    await userEvent.click(screen.getByRole('button', { name: /summarize/i }))
    await waitFor(() => expect(summarizeTicket).toHaveBeenCalledWith(1))
  })

  it('shows the summary after a successful call', async () => {
    vi.mocked(summarizeTicket).mockResolvedValue('A short summary.')
    renderWithQuery(<TicketSummary ticket={TICKET} />)
    await userEvent.click(screen.getByRole('button', { name: /summarize/i }))
    expect(await screen.findByText('A short summary.')).toBeInTheDocument()
  })

  it('regenerates the summary on every click', async () => {
    vi.mocked(summarizeTicket)
      .mockResolvedValueOnce('First summary.')
      .mockResolvedValueOnce('Second summary.')
    renderWithQuery(<TicketSummary ticket={TICKET} />)
    const button = screen.getByRole('button', { name: /summarize/i })

    await userEvent.click(button)
    expect(await screen.findByText('First summary.')).toBeInTheDocument()

    await userEvent.click(button)
    expect(await screen.findByText('Second summary.')).toBeInTheDocument()
    expect(summarizeTicket).toHaveBeenCalledTimes(2)
  })

  it('shows an error message when summarizeTicket rejects', async () => {
    vi.mocked(summarizeTicket).mockRejectedValue(new Error('AI error'))
    renderWithQuery(<TicketSummary ticket={TICKET} />)
    await userEvent.click(screen.getByRole('button', { name: /summarize/i }))
    expect(await screen.findByText('AI error')).toBeInTheDocument()
  })
})
