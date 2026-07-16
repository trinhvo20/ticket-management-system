import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { renderWithQuery } from '../test/render-with-query'
import { ReplyList } from './ReplyList'
import { getReplies } from '../lib/api'

vi.mock('../lib/api', () => ({
  getReplies: vi.fn(),
  replyKeys: { all: (id: number) => ['tickets', id, 'replies'] },
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

beforeEach(() => {
  vi.mocked(getReplies).mockResolvedValue([])
})

describe('ReplyList', () => {
  describe('empty state', () => {
    it('shows "No replies yet" when there are no replies', async () => {
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('No replies yet.')).toBeInTheDocument()
    })
  })

  describe('agent reply', () => {
    beforeEach(() => {
      vi.mocked(getReplies).mockResolvedValue([REPLY_AGENT])
    })

    it('shows the author name', async () => {
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('Bob')).toBeInTheDocument()
    })

    it('shows the Agent badge', async () => {
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('Agent')).toBeInTheDocument()
    })

    it('shows the reply body', async () => {
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('We are looking into this.')).toBeInTheDocument()
    })

    it('falls back to "Agent" when author is null', async () => {
      vi.mocked(getReplies).mockResolvedValue([{ ...REPLY_AGENT, author: null }])
      renderWithQuery(<ReplyList ticket={TICKET} />)
      const matches = await screen.findAllByText('Agent')
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  describe('customer reply', () => {
    beforeEach(() => {
      vi.mocked(getReplies).mockResolvedValue([REPLY_CUSTOMER])
    })

    it('shows the ticket fromName as the sender', async () => {
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('Alice')).toBeInTheDocument()
    })

    it('shows the Customer badge', async () => {
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('Customer')).toBeInTheDocument()
    })

    it('shows the reply body', async () => {
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('Any updates?')).toBeInTheDocument()
    })
  })

  describe('multiple replies', () => {
    it('renders all replies in order', async () => {
      vi.mocked(getReplies).mockResolvedValue([REPLY_AGENT, REPLY_CUSTOMER])
      renderWithQuery(<ReplyList ticket={TICKET} />)
      expect(await screen.findByText('We are looking into this.')).toBeInTheDocument()
      expect(screen.getByText('Any updates?')).toBeInTheDocument()
    })
  })
})
