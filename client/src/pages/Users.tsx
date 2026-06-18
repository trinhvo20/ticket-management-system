import { useQuery, useMutation } from '@tanstack/react-query'
import { useSession } from '../lib/auth-client'
import { getUsers, deleteUser, userKeys, queryClient } from '../lib/api'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { AddUserForm } from './AddUserForm'
import { UserTable } from './UserTable'

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

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Add User</Button>
        )}
      </div>

      {showForm && (
        <AddUserForm
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {fetchError && (
        <p className="text-sm text-destructive">{(fetchError as Error).message}</p>
      )}

      <UserTable
        users={users}
        isLoading={isLoading}
        currentUserId={session?.user.id}
        onDelete={(id) => deleteMutation.mutate(id)}
        deletingId={deleteMutation.isPending ? deleteMutation.variables : undefined}
      />
    </div>
  )
}
