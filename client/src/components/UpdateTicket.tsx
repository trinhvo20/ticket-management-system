import { useQuery, useMutation } from '@tanstack/react-query'
import { TicketStatus, TicketCategory } from '@ticket/core'
import type { TicketDetail } from '../lib/api'
import { getAgents, updateTicket, ticketKeys, agentKeys, queryClient } from '../lib/api'
import { formatCategory, formatStatus } from '../lib/ticket-utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  ticket: TicketDetail
}

export function UpdateTicket({ ticket }: Props) {
  const { data: agents = [] } = useQuery({
    queryKey: agentKeys.all,
    queryFn: getAgents,
  })

  const mutation = useMutation({
    mutationFn: (payload: {
      status?: TicketStatus
      category?: TicketCategory | null
      assignedToId?: string | null
    }) => updateTicket(ticket.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticket.id) }),
  })

  return (
    <Card>
      <CardContent className="pt-4">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground mb-1">Status</dt>
            <dd>
              <Select
                value={ticket.status}
                onValueChange={(val) => mutation.mutate({ status: val as TicketStatus })}
                disabled={mutation.isPending}
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
                  mutation.mutate({ category: val === '__none__' ? null : (val as TicketCategory) })
                }
                disabled={mutation.isPending}
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
                  mutation.mutate({ assignedToId: val === '__unassigned__' ? null : val })
                }
                disabled={mutation.isPending}
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
      </CardContent>
    </Card>
  )
}
