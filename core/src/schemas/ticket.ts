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

export const ReplyType = { Agent: 'agent', Customer: 'customer' } as const
export type ReplyType = (typeof ReplyType)[keyof typeof ReplyType]

export const createReplySchema = z.object({
  body: z.string().min(1, 'Reply cannot be empty'),
})
export type CreateReplyInput = z.infer<typeof createReplySchema>

export const inboundEmailSchema = z.object({
  from: z.string().email('Invalid sender email').max(254),
  fromName: z.string().trim().min(1, 'Sender name is required').max(255),
  subject: z.string().trim().min(1, 'Subject is required').max(255),
  body: z.string().trim().min(1, 'Body is required').max(1_000),
  bodyHtml: z.string().max(2_000).optional(),
})

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>

