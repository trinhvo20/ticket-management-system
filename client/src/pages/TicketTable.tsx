import { TicketStatus, TicketCategory } from '@ticket/core'
import type { Ticket } from '../lib/api'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function StatusBadge({ status }: { status: TicketStatus }) {
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

function formatCategory(category: TicketCategory | null) {
  if (!category) return '—'
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface TicketTableProps {
  tickets: Ticket[]
  isLoading: boolean
}

export function TicketTable({ tickets, isLoading }: TicketTableProps) {
  if (isLoading) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 w-16">#</TableHead>
              <TableHead className="px-4">Subject</TableHead>
              <TableHead className="px-4">From</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Category</TableHead>
              <TableHead className="px-4">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="px-4"><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 w-16">#</TableHead>
            <TableHead className="px-4">Subject</TableHead>
            <TableHead className="px-4">From</TableHead>
            <TableHead className="px-4">Status</TableHead>
            <TableHead className="px-4">Category</TableHead>
            <TableHead className="px-4">Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="px-4 text-muted-foreground">{ticket.id}</TableCell>
              <TableCell className="px-4 font-medium">{ticket.subject}</TableCell>
              <TableCell className="px-4 text-muted-foreground">
                <div>{ticket.fromName}</div>
                <div className="text-xs">{ticket.fromEmail}</div>
              </TableCell>
              <TableCell className="px-4">
                <StatusBadge status={ticket.status} />
              </TableCell>
              <TableCell className="px-4 text-muted-foreground">
                {formatCategory(ticket.category)}
              </TableCell>
              <TableCell className="px-4 text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {tickets.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No tickets yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
