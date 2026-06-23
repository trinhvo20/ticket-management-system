import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Role, updateUserSchema, type UpdateUserInput } from '@ticket/core'
import { updateUser, userKeys, queryClient, type User } from '../lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface EditUserDialogProps {
  user: User | null
  currentUserId: string | undefined
  onClose: () => void
  onSuccess: () => void
}

export function EditUserDialog({ user, currentUserId, onClose, onSuccess }: EditUserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
  })

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email, role: user.role, password: '' })
    }
  }, [user, reset])

  const editMutation = useMutation({
    mutationFn: (values: UpdateUserInput) => updateUser(user!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      onSuccess()
    },
    onError: (err: Error) => {
      setError('root', { message: err.message })
    },
  })

  const isSelf = user?.id === currentUserId

  return (
    <Dialog open={user !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update the user's name, email, role, or password.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            editMutation.mutate({ ...values, password: values.password?.trim() || undefined })
          )}
          noValidate
        >
          <FieldGroup>
            <div className="flex flex-col gap-5">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="edit-name">Name</FieldLabel>
                <Input id="edit-name" autoComplete="off" {...register('name')} />
                <FieldError errors={errors.name ? [errors.name] : undefined} />
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="edit-email">Email</FieldLabel>
                <Input id="edit-email" type="email" autoComplete="off" {...register('email')} />
                <FieldError errors={errors.email ? [errors.email] : undefined} />
              </Field>
              <Field data-invalid={!!errors.role}>
                <FieldLabel htmlFor="edit-role">Role</FieldLabel>
                <select
                  id="edit-role"
                  {...register('role')}
                  disabled={isSelf}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={Role.Agent}>Agent</option>
                  <option value={Role.Admin}>Admin</option>
                </select>
                <FieldError errors={errors.role ? [errors.role] : undefined} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="edit-password">Password</FieldLabel>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  autoComplete="new-password"
                  {...register('password')}
                />
                <FieldError errors={errors.password ? [errors.password] : undefined} />
              </Field>
            </div>
            {errors.root && <FieldError>{errors.root.message}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
