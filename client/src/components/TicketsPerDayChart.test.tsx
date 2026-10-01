import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TicketsPerDayChart, TicketsPerDayChartSkeleton } from './TicketsPerDayChart'

const DAILY_COUNTS = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  count: i % 5,
}))

describe('TicketsPerDayChart', () => {
  it('shows the chart title', () => {
    render(<TicketsPerDayChart dailyCounts={DAILY_COUNTS} />)
    expect(screen.getByText('Tickets per Day (Last 30 Days)')).toBeInTheDocument()
  })

  it('renders without the daily counts data', () => {
    render(<TicketsPerDayChart dailyCounts={[]} />)
    expect(screen.getByText('Tickets per Day (Last 30 Days)')).toBeInTheDocument()
  })
})

describe('TicketsPerDayChartSkeleton', () => {
  it('renders a skeleton placeholder', () => {
    const { container } = render(<TicketsPerDayChartSkeleton />)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })
})
