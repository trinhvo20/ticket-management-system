import { z } from 'zod'

export enum TicketStatus {
  Open = 'open',
  Resolved = 'resolved',
  Closed = 'closed',
}

export enum TicketCategory {
  GeneralQuestion = 'general_question',
  TechnicalQuestion = 'technical_question',
  RefundRequest = 'refund_request',
}

export const inboundEmailSchema = z.object({
  from: z.string().email('Invalid sender email').max(254),
  fromName: z.string().trim().min(1, 'Sender name is required').max(255),
  subject: z.string().trim().min(1, 'Subject is required').max(998),
  body: z.string().trim().min(1, 'Body is required').max(100_000),
  bodyHtml: z.string().max(200_000).optional(),
})

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>

export const assignTicketSchema = z.object({
  assignedToId: z.string().nullable(),
})

export type AssignTicketInput = z.infer<typeof assignTicketSchema>
