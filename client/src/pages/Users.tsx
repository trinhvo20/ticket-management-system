import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSession } from '../lib/auth-client'
import { getUsers, createUser, deleteUser, userKeys, queryClient } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['agent', 'admin']),
})

type CreateUserValues = z.infer<typeof createUserSchema>

export function Users() {
  const { data: session } = useSession()
  const [showForm, setShowForm] = useState(false)

  const {
    data: users = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: userKeys.all,
    queryFn: getUsers,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'agent' },
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      setShowForm(false)
      reset()
    },
    onError: (err: Error) => {
      setError('root', { message: err.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })

  function handleCancel() {
    setShowForm(false)
    reset()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Add Agent</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add new user</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} noValidate>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input id="name" autoComplete="off" {...register('name')} />
                    <FieldError errors={errors.name ? [errors.name] : undefined} />
                  </Field>
                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input id="email" type="email" autoComplete="off" {...register('email')} />
                    <FieldError errors={errors.email ? [errors.email] : undefined} />
                  </Field>
                  <Field data-invalid={!!errors.password}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
                    <FieldError errors={errors.password ? [errors.password] : undefined} />
                  </Field>
                  <Field data-invalid={!!errors.role}>
                    <FieldLabel htmlFor="role">Role</FieldLabel>
                    <select
                      id="role"
                      {...register('role')}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                    <FieldError errors={errors.role ? [errors.role] : undefined} />
                  </Field>
                </div>
                {errors.root && <FieldError>{errors.root.message}</FieldError>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create user'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}

      {fetchError && (
        <p className="text-sm text-destructive">{(fetchError as Error).message}</p>
      )}

      {isLoading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Email</TableHead>
                <TableHead className="px-4">Role</TableHead>
                <TableHead className="px-4">Created</TableHead>
                <TableHead className="px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-4"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="px-4"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="px-4"><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                  <TableCell className="px-4"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-4" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Name</TableHead>
                <TableHead className="px-4">Email</TableHead>
                <TableHead className="px-4">Role</TableHead>
                <TableHead className="px-4">Created</TableHead>
                <TableHead className="px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === session?.user.id
                const isDeleting = deleteMutation.isPending && deleteMutation.variables === user.id
                return (
                  <TableRow key={user.id}>
                    <TableCell className="px-4 font-medium">{user.name}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="px-4">
                      <span
                        className={
                          user.role === 'admin'
                            ? 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700'
                            : 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600'
                        }
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button
                        variant="destructive"
                        size="xs"
                        disabled={isSelf || isDeleting}
                        onClick={() => deleteMutation.mutate(user.id)}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
