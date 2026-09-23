import { useMutation } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import type { TicketDetail } from '../lib/api'
import { summarizeTicket } from '../lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  ticket: TicketDetail
}

export function TicketSummary({ ticket }: Props) {
  const summarizeMutation = useMutation({
    mutationFn: () => summarizeTicket(ticket.id),
  })

  return (
    <Card>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={summarizeMutation.isPending}
          onClick={() => summarizeMutation.mutate()}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {summarizeMutation.isPending ? 'Summarizing…' : 'Summarize'}
        </Button>

        {summarizeMutation.isError && (
          <p className="text-sm text-destructive">
            {summarizeMutation.error instanceof Error
              ? summarizeMutation.error.message
              : 'Failed to summarize.'}
          </p>
        )}

        {summarizeMutation.isSuccess && (
          <div>
            <p className="text-muted-foreground mb-2 text-sm">Summary</p>
            <p className="text-sm leading-relaxed">{summarizeMutation.data}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
