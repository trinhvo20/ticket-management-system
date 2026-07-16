import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { TicketInfo } from './TicketInfo'

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

describe('TicketInfo', () => {
  it('shows the ticket subject as the card title', () => {
    renderWithQuery(<TicketInfo ticket={TICKET} />)
    expect(screen.getByText('Login is broken')).toBeInTheDocument()
  })

  it('shows the sender name and email', () => {
    renderWithQuery(<TicketInfo ticket={TICKET} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows the message body', () => {
    renderWithQuery(<TicketInfo ticket={TICKET} />)
    expect(screen.getByText('I cannot log in since this morning.')).toBeInTheDocument()
  })

  it('renders the created and updated timestamps', () => {
    renderWithQuery(<TicketInfo ticket={TICKET} />)
    expect(screen.getByText(new Date(TICKET.createdAt).toLocaleString())).toBeInTheDocument()
    expect(screen.getByText(new Date(TICKET.updatedAt).toLocaleString())).toBeInTheDocument()
  })
})
