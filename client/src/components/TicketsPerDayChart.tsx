import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import type { DailyTicketCount } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  count: {
    label: 'Tickets',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function formatDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

interface TicketsPerDayChartProps {
  dailyCounts: DailyTicketCount[]
}

export function TicketsPerDayChart({ dailyCounts }: TicketsPerDayChartProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Tickets per Day (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart accessibilityLayer data={dailyCounts}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDayLabel}
              interval="preserveStartEnd"
            />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDayLabel(value)} />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function TicketsPerDayChartSkeleton() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}
