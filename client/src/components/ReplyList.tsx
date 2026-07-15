import type { TicketReply } from '../lib/api'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  replies: TicketReply[]
  fromName: string
}

export function ReplyList({ replies, fromName }: Props) {
  if (replies.length === 0) {
    return <p className="text-sm text-muted-foreground">No replies yet.</p>
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <Card key={reply.id}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                {reply.senderType === 'agent' ? (reply.author?.name ?? 'Agent') : fromName}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                reply.senderType === 'agent'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {reply.senderType === 'agent' ? 'Agent' : 'Customer'}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
