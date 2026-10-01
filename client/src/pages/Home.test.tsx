import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithQuery } from '../test/render-with-query'
import { Home } from './Home'
import { getStats } from '../lib/api'
import { useSession } from '../lib/auth-client'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../lib/api', () => ({
  getStats: vi.fn(),
  dashboardKeys: { all: ['dashboard'], stats: () => ['dashboard', 'stats'] },
}))

vi.mock('../lib/auth-client', () => ({
  useSession: vi.fn(),
}))

const DAILY_COUNTS = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  count: i % 5,
}))

const STATS = {
  total: 42,
  open: 5,
  resolvedByAi: 20,
  pctResolvedByAi: 47.6,
  avgResolutionTimeMs: 2.5 * 60 * 60 * 1000,
  dailyCounts: DAILY_COUNTS,
}

describe('Home page', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Alice Admin' } },
      isPending: false,
    } as any)
  })

  it('shows skeletons while loading, before the stat cards and chart appear', () => {
    vi.mocked(getStats).mockReturnValue(new Promise(() => {}))

    renderWithQuery(<Home />)

    expect(screen.getByText('Welcome back, Alice Admin.')).toBeInTheDocument()
    expect(screen.queryByText('Total Tickets')).not.toBeInTheDocument()
    expect(screen.queryByText('Tickets per Day (Last 30 Days)')).not.toBeInTheDocument()
  })

  it('renders the stat cards and the daily tickets chart once stats load', async () => {
    vi.mocked(getStats).mockResolvedValue(STATS)

    renderWithQuery(<Home />)

    expect(await screen.findByText('Total Tickets')).toBeInTheDocument()
    expect(screen.getByText('Tickets per Day (Last 30 Days)')).toBeInTheDocument()
  })
})
