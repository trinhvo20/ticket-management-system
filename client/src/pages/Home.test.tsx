import { screen, waitFor } from '@testing-library/react'
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

const STATS = {
  total: 42,
  open: 5,
  resolvedByAi: 20,
  pctResolvedByAi: 47.6,
  avgResolutionTimeMs: 2.5 * 60 * 60 * 1000,
}

describe('Home page', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Alice Admin' } },
      isPending: false,
    } as any)
  })

  it('shows skeletons while loading', () => {
    vi.mocked(getStats).mockReturnValue(new Promise(() => {}))

    renderWithQuery(<Home />)

    expect(screen.getByText('Welcome back, Alice Admin.')).toBeInTheDocument()
    expect(screen.queryByText('Total Tickets')).not.toBeInTheDocument()
  })

  it('renders all five dashboard stats once loaded', async () => {
    vi.mocked(getStats).mockResolvedValue(STATS)

    renderWithQuery(<Home />)

    expect(await screen.findByText('Total Tickets')).toBeInTheDocument()
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

  it('shows a dash for average resolution time when no ticket has been resolved yet', async () => {
    vi.mocked(getStats).mockResolvedValue({ ...STATS, avgResolutionTimeMs: null })

    renderWithQuery(<Home />)

    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument())
  })
})
