import { useParams, Link } from 'react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { TicketStatus, TicketCategory } from '@ticket/core'
import {
  getTicket,
  getAgents,
  updateTicket,
  ticketKeys,
  agentKeys,
  queryClient,
} from '../lib/api'
import { formatCategory, formatStatus } from '../lib/ticket-utils'
import { ReplyList } from '../components/ReplyList'
import { ReplyForm } from '../components/ReplyForm'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  const { data: agents = [] } = useQuery({
    queryKey: agentKeys.all,
    queryFn: getAgents,
    enabled: !isNaN(ticketId),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: {
      status?: TicketStatus
      category?: TicketCategory | null
      assignedToId?: string | null
    }) => updateTicket(ticketId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
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
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            {/* Left: metadata + message */}
            <div className="flex-1 min-w-0 space-y-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">From</dt>
                <dd>
                  <span className="font-medium">{ticket.fromName}</span>
                  <span className="text-muted-foreground text-xs ml-2">{ticket.fromEmail}</span>
                </dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
              </dl>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-2 text-sm">Message</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.body}</p>
              </div>
            </div>

            {/* Right: editable fields */}
            <div className="w-52 shrink-0">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1">Status</dt>
                  <dd>
                    <Select
                      value={ticket.status}
                      onValueChange={(val) => updateMutation.mutate({ status: val as TicketStatus })}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TicketStatus.Open}>
                          {formatStatus(TicketStatus.Open)}
                        </SelectItem>
                        <SelectItem value={TicketStatus.Resolved}>
                          {formatStatus(TicketStatus.Resolved)}
                        </SelectItem>
                        <SelectItem value={TicketStatus.Closed}>
                          {formatStatus(TicketStatus.Closed)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Category</dt>
                  <dd>
                    <Select
                      value={ticket.category ?? '__none__'}
                      onValueChange={(val) =>
                        updateMutation.mutate({ category: val === '__none__' ? null : (val as TicketCategory) })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        <SelectItem value={TicketCategory.GeneralQuestion}>
                          {formatCategory(TicketCategory.GeneralQuestion)}
                        </SelectItem>
                        <SelectItem value={TicketCategory.TechnicalQuestion}>
                          {formatCategory(TicketCategory.TechnicalQuestion)}
                        </SelectItem>
                        <SelectItem value={TicketCategory.RefundRequest}>
                          {formatCategory(TicketCategory.RefundRequest)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Assigned To</dt>
                  <dd>
                    <Select
                      value={ticket.assignedTo?.id ?? '__unassigned__'}
                      onValueChange={(val) =>
                        updateMutation.mutate({ assignedToId: val === '__unassigned__' ? null : val })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply thread + form */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Replies</h2>
        <ReplyList ticket={ticket} />
        <ReplyForm ticket={ticket} />
      </div>
    </div>
  )
}
