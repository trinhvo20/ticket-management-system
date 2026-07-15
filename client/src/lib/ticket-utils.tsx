import { TicketStatus, TicketCategory } from '@ticket/core'

export function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.Open]: 'bg-blue-100 text-blue-700',
    [TicketStatus.Resolved]: 'bg-green-100 text-green-700',
    [TicketStatus.Closed]: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

export function CategoryBadge({ category }: { category: TicketCategory | null }) {
  if (!category) return null
  const styles: Record<TicketCategory, string> = {
    [TicketCategory.GeneralQuestion]: 'bg-purple-100 text-purple-700',
    [TicketCategory.TechnicalQuestion]: 'bg-orange-100 text-orange-700',
    [TicketCategory.RefundRequest]: 'bg-rose-100 text-rose-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[category]}`}>
      {formatCategory(category)}
    </span>
  )
}

export function formatCategory(category: TicketCategory | null) {
  if (!category) return '—'
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
