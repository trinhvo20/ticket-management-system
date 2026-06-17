import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from '../lib/auth-client'
import { getUsers, createUser, deleteUser, type User } from '../lib/api'
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

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['agent', 'admin']),
})

type CreateUserValues = z.infer<typeof createUserSchema>

export function Users() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  useEffect(() => {
    getUsers()
      .then(({ users }) => setUsers(users))
      .catch((err) => setPageError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(values: CreateUserValues) {
    try {
      const { user } = await createUser(values)
      setUsers((prev) => [...prev, user])
      setShowForm(false)
      reset()
    } catch (err: any) {
      setError('root', { message: err.message })
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteUser(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err: any) {
      setPageError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

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
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
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

      {pageError && (
        <p className="text-sm text-destructive">{pageError}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading users...</p>
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
                        disabled={isSelf || deletingId === user.id}
                        onClick={() => handleDelete(user.id)}
                      >
                        {deletingId === user.id ? 'Deleting...' : 'Delete'}
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
