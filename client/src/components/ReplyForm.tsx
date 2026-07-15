import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createReplySchema, type CreateReplyInput } from '@ticket/core'
import { createReply, replyKeys, queryClient } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'

interface Props {
  ticketId: number
}

export function ReplyForm({ ticketId }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
  })

  const mutation = useMutation({
    mutationFn: (data: CreateReplyInput) => createReply(ticketId, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: replyKeys.all(ticketId) })
      reset()
    },
    onError: (err: Error) => {
      setError('root', { message: err.message })
    },
  })

  return (
    <Card>
      <CardContent className="py-4 px-4">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-3">
          <Field>
            <FieldLabel htmlFor="reply-body">Reply</FieldLabel>
            <textarea
              id="reply-body"
              rows={4}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Write your reply…"
              disabled={mutation.isPending}
              {...register('body')}
            />
            <FieldError errors={[errors.body]} />
          </Field>
          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send Reply'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
