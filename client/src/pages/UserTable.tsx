import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import type { User } from '../lib/api'
import { deleteUser, userKeys, queryClient } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DeleteUserDialog } from './DeleteUserDialog'
import { EditUserDialog } from './EditUserDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface UserTableProps {
  users: User[]
  isLoading: boolean
  currentUserId: string | undefined
}

export function UserTable({ users, isLoading, currentUserId }: UserTableProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      setDeletingUser(null)
    },
  })

  if (isLoading) {
    return (
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
    )
  }

  return (
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
            const isSelf = user.id === currentUserId
            const isAdmin = user.role === 'admin'
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
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Edit user"
                      onClick={() => setEditingUser(user)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-xs"
                      aria-label="Delete user"
                      disabled={isSelf || isAdmin}
                      onClick={() => setDeletingUser(user)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
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
      <EditUserDialog
        user={editingUser}
        currentUserId={currentUserId}
        onClose={() => setEditingUser(null)}
        onSuccess={() => setEditingUser(null)}
      />
      <DeleteUserDialog
        user={deletingUser}
        isPending={deleteMutation.isPending}
        error={deleteMutation.error?.message}
        onClose={() => { setDeletingUser(null); deleteMutation.reset() }}
        onConfirm={() => deleteMutation.mutate(deletingUser!.id)}
      />
    </Card>
  )
}
