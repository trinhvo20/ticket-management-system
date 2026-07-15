import { TicketStatus, TicketCategory } from '@ticket/core'

export function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.Open]: 'bg-blue-100 text-blue-700',
    [TicketStatus.Resolved]: 'bg-green-100 text-green-700',
    [TicketStatus.Closed]: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {formatStatus(status)}
    </span>
  )
}


const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.GeneralQuestion]: 'General Question',
  [TicketCategory.TechnicalQuestion]: 'Technical Question',
  [TicketCategory.RefundRequest]: 'Refund Request',
}

export function formatCategory(category: TicketCategory | null) {
  if (!category) return '—'
  return CATEGORY_LABELS[category]
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.Open]: 'Open',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
}

export function formatStatus(status: TicketStatus) {
  return STATUS_LABELS[status]
}
