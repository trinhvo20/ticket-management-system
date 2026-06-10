import { useNavigate } from 'react-router'
import { authClient, useSession } from '../lib/auth-client'

export function Nav() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  async function handleSignOut() {
    await authClient.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <span className="text-lg font-semibold text-gray-900">Ticket Management System</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{session?.user.name}</span>
        <button
          onClick={handleSignOut}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
