import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createReplySchema, type CreateReplyInput } from '@ticket/core'
import type { TicketDetail } from '../lib/api'
import { createReply, polishReply, replyKeys, queryClient } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'

interface Props {
  ticket: TicketDetail
}

export function ReplyForm({ ticket }: Props) {
  const { id: ticketId } = ticket
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
  })

  const isBodyEmpty = !watch('body')?.trim()

  const replyMutation = useMutation({
    mutationFn: (data: CreateReplyInput) => createReply(ticketId, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: replyKeys.all(ticketId) })
      reset()
    },
    onError: (err: Error) => {
      setError('root', { message: err.message })
    },
  })

  const polishMutation = useMutation({
    mutationFn: (body: string) => polishReply(ticketId, body),
    onSuccess: (polished) => {
      setValue('body', polished)
    },
    onError: (err: Error) => {
      setError('root', { message: err.message })
    },
  })

  return (
    <Card>
      <CardContent className="py-4 px-4">
        <form onSubmit={handleSubmit((data) => replyMutation.mutate(data))} className="space-y-3">
          <Field>
            <FieldLabel htmlFor="reply-body">Reply</FieldLabel>
            <textarea
              id="reply-body"
              rows={4}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Write your reply…"
              disabled={replyMutation.isPending || polishMutation.isPending}
              {...register('body')}
            />
          </Field>
          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          // Buttons
          <div className="flex justify-end gap-2">
            // Polish button
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBodyEmpty || isSubmitting || replyMutation.isPending || polishMutation.isPending}
              onClick={() => polishMutation.mutate(watch('body'))}
            >
              {polishMutation.isPending ? 'Polishing…' : 'Polish'}
            </Button>
            // Send Reply button
            <Button
              type="submit"
              size="sm"
              disabled={isBodyEmpty || isSubmitting || replyMutation.isPending}
            >
              {replyMutation.isPending ? 'Sending…' : 'Send Reply'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
