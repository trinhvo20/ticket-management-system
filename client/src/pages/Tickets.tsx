import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { getTickets, ticketKeys } from '../lib/api'
import type { TicketQueryParams } from '../lib/api'
import { TicketTable } from './TicketTable'
import { TicketFilters } from './TicketFilters'

export function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>()
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | undefined>()

  const queryParams: TicketQueryParams = {
    ...(sorting.length > 0 && {
      sortBy: sorting[0].id,
      sortOrder: sorting[0].desc ? 'desc' : 'asc',
    }),
    ...(search && { search }),
    ...(statusFilter !== undefined && { status: statusFilter }),
    ...(categoryFilter !== undefined && { category: categoryFilter }),
  }

  const {
    data: tickets = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ticketKeys.list(queryParams),
    queryFn: () => getTickets(queryParams),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>

      <TicketFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      {fetchError && (
        <p className="text-sm text-destructive">{(fetchError as Error).message}</p>
      )}
      <TicketTable
        tickets={tickets}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  )
}
