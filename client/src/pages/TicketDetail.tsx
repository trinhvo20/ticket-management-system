import { useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getTicket, ticketKeys } from '../lib/api'
import { StatusBadge, formatCategory } from '../lib/ticket-utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'


function TicketDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-36" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Separator />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function TicketDetail() {
  const { id: idParam } = useParams<{ id: string }>()
  const ticketId = parseInt(idParam ?? '', 10)

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => getTicket(ticketId),
    enabled: !isNaN(ticketId),
  })

  if (isNaN(ticketId)) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Invalid ticket ID.</p>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tickets"><ArrowLeft className="mr-2 h-4 w-4" />Back to Tickets</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) return <TicketDetailSkeleton />

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load ticket.'}
        </p>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tickets"><ArrowLeft className="mr-2 h-4 w-4" />Back to Tickets</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/tickets"><ArrowLeft className="mr-2 h-4 w-4" />Back to Tickets</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{ticket.subject}</CardTitle>
          <CardAction>
            <StatusBadge status={ticket.status} />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">From</dt>
              <dd>
                <span className="font-medium">{ticket.fromName}</span>
                <span className="text-muted-foreground text-xs ml-2">{ticket.fromEmail}</span>
              </dd>
              <dt className="text-muted-foreground">Received</dt>
              <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
            </dl>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">Category</dt>
              <dd>{formatCategory(ticket.category)}</dd>
              <dt className="text-muted-foreground">Assigned To</dt>
              <dd>{ticket.assignedTo?.name ?? '—'}</dd>
            </dl>
          </div>

          <Separator />

          <div>
            <p className="text-muted-foreground mb-2 text-sm">Message</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.body}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
