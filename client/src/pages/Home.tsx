import { useSession } from '../lib/auth-client'

export function Home() {
  const { data: session } = useSession()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome back, {session?.user.name}.
      </p>
    </div>
  )
}
