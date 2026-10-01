import { useQuery } from '@tanstack/react-query'
import { useSession } from '../lib/auth-client'
import { dashboardKeys, getStats } from '../lib/api'
import { DashboardStatCards, DashboardStatCardsSkeleton } from '../components/DashboardStatCards'
import { TicketsPerDayChart, TicketsPerDayChartSkeleton } from '../components/TicketsPerDayChart'

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

      {isLoading || !stats ? <DashboardStatCardsSkeleton /> : <DashboardStatCards stats={stats} />}

      {isLoading || !stats ? (
        <TicketsPerDayChartSkeleton />
      ) : (
        <TicketsPerDayChart dailyCounts={stats.dailyCounts} />
      )}
    </div>
  )
}
