import { useQuery } from '@tanstack/react-query'
import { useSession } from '../lib/auth-client'
import { dashboardKeys, getStats } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'

  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) return `${hours}h ${remainingMinutes}m`

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

interface StatCardProps {
  label: string
  value: string
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  )
}

export function Home() {
  const { data: session } = useSession()
  const { data: stats, isLoading } = useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getStats,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Welcome back, {session?.user.name}.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Tickets" value={stats.total.toString()} />
            <StatCard label="Open Tickets" value={stats.open.toString()} />
            <StatCard label="Resolved by AI" value={stats.resolvedByAi.toString()} />
            <StatCard label="% Resolved by AI" value={`${stats.pctResolvedByAi.toFixed(1)}%`} />
            <StatCard label="Avg Resolution Time" value={formatDuration(stats.avgResolutionTimeMs)} />
          </>
        )}
      </div>
    </div>
  )
}
