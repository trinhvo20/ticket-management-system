import { Bot, Clock, Inbox, Percent, Ticket, type LucideIcon } from 'lucide-react'
import type { DashboardStats } from '../lib/api'
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
  icon: LucideIcon
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
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

interface DashboardStatCardsProps {
  stats: DashboardStats
}

export function DashboardStatCards({ stats }: DashboardStatCardsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Total Tickets" icon={Ticket} value={stats.total.toString()} />
      <StatCard label="Open Tickets" icon={Inbox} value={stats.open.toString()} />
      <StatCard label="Resolved by AI" icon={Bot} value={stats.resolvedByAi.toString()} />
      <StatCard label="% Resolved by AI" icon={Percent} value={`${stats.pctResolvedByAi.toFixed(1)}%`} />
      <StatCard label="Avg Resolution Time" icon={Clock} value={formatDuration(stats.avgResolutionTimeMs)} />
    </div>
  )
}

export function DashboardStatCardsSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}
