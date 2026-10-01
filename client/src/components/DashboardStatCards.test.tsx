import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DashboardStatCards, DashboardStatCardsSkeleton } from './DashboardStatCards'

const STATS = {
  total: 42,
  open: 5,
  resolvedByAi: 20,
  pctResolvedByAi: 47.6,
  avgResolutionTimeMs: 2.5 * 60 * 60 * 1000,
  dailyCounts: [],
}

describe('DashboardStatCards', () => {
  it('renders all five stats with formatted values', () => {
    render(<DashboardStatCards stats={STATS} />)

    expect(screen.getByText('Total Tickets')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Open Tickets')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Resolved by AI')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('% Resolved by AI')).toBeInTheDocument()
    expect(screen.getByText('47.6%')).toBeInTheDocument()
    expect(screen.getByText('Avg Resolution Time')).toBeInTheDocument()
    expect(screen.getByText('2h 30m')).toBeInTheDocument()
  })

  it('shows a dash for average resolution time when no ticket has been resolved yet', () => {
    render(<DashboardStatCards stats={{ ...STATS, avgResolutionTimeMs: null }} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('DashboardStatCardsSkeleton', () => {
  it('renders five skeleton placeholders', () => {
    const { container } = render(<DashboardStatCardsSkeleton />)

    expect(container.querySelectorAll('[data-slot="card"]').length).toBe(5)
  })
})
