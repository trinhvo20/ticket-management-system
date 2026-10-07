import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard } from 'lucide-react'
import { useSession } from '../lib/auth-client'
import { dashboardKeys, getStats } from '../lib/api'
import { DashboardStatCards, DashboardStatCardsSkeleton } from '../components/DashboardStatCards'
import { PageHeader } from '../components/PageHeader'
import { TicketsPerDayChart, TicketsPerDayChartSkeleton } from '../components/TicketsPerDayChart'

export function Home() {
  const { data: session } = useSession()
  const { data: stats, isLoading } = useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getStats,
  })

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={`Welcome back, ${session?.user.name ?? ''}.`}
      />

      {isLoading || !stats ? <DashboardStatCardsSkeleton /> : <DashboardStatCards stats={stats} />}

      {isLoading || !stats ? (
        <TicketsPerDayChartSkeleton />
      ) : (
        <TicketsPerDayChart dailyCounts={stats.dailyCounts} />
      )}
    </div>
  )
}
