import type { TicketDetail } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Props {
  ticket: TicketDetail
}

export function TicketInfo({ ticket }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ticket.subject}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
