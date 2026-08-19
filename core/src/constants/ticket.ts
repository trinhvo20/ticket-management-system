import { TicketStatus, TicketCategory } from '../schemas/ticket'

export interface Ticket {
  id: number
  subject: string
  fromEmail: string
  fromName: string
  status: TicketStatus
  category: TicketCategory | null
  assignedToId: string | null
  createdAt: string
}

export interface TicketDetail extends Ticket {
  body: string
  bodyHtml?: string
  updatedAt: string
  assignedTo: { id: string; name: string } | null
}

export interface TicketQueryParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: TicketStatus
  category?: TicketCategory
  search?: string
  page?: number
  pageSize?: number
}

export interface TicketPage {
  tickets: Ticket[]
  total: number
}

export interface TicketReply {
  id: number
  ticketId: number
  senderType: 'agent' | 'customer'
  body: string
  bodyHtml?: string
  createdAt: string
  author: { id: string; name: string } | null
}

export interface Agent {
  id: string
  name: string
}
