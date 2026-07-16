import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getTicket, ticketKeys } from '../lib/api'
import { BackLink } from '../components/BackLink'
import { TicketInfo } from '../components/TicketInfo'
import { UpdateTicket } from '../components/UpdateTicket'
import { ReplyList } from '../components/ReplyList'
import { ReplyForm } from '../components/ReplyForm'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
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
        <CardContent>
          <div className="flex gap-8">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
              <Separator />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="w-52 shrink-0 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
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
        <BackLink to="/tickets" label="Back to Tickets" />
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
        <BackLink to="/tickets" label="Back to Tickets" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackLink to="/tickets" label="Back to Tickets" />

      <div className="flex gap-6 items-start">
        {/* Left column: TicketInfo, ReplyList, ReplyForm */}
        <div className="flex-1 min-w-0 space-y-3">
          <TicketInfo ticket={ticket} />
          <h2 className="text-sm font-semibold">Replies</h2>
          <ReplyList ticket={ticket} />
          <ReplyForm ticket={ticket} />
        </div>
        {/* Right column: UpdateTicket */}
        <div className="w-52 shrink-0">
          <UpdateTicket ticket={ticket} />
        </div>
      </div>
    </div>
  )
}
