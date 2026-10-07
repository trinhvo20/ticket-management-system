import { useQuery } from '@tanstack/react-query'
import { Plus, Users as UsersIcon } from 'lucide-react'
import { useSession } from '../lib/auth-client'
import { getUsers, userKeys } from '../lib/api'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersIcon}
        title="Users"
        description="Admins and agents who can sign in to the desk."
        action={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" />
              Add User
            </Button>
          )
        }
      />

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
      />
    </div>
  )
}
