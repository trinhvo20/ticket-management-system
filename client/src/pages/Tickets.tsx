import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { TicketStatus, TicketCategory } from '@ticket/core'
import { getTickets, getAgents, ticketKeys, agentKeys } from '../lib/api'
import type { TicketQueryParams } from '../lib/api'
import { TicketTable } from './TicketTable'
import { TicketFilters } from './TicketFilters'
import { TicketPagination } from './TicketPagination'

const PAGE_SIZE = 10

export function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>()
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | undefined>()
  const [assignedToIdFilter, setAssignedToIdFilter] = useState<string | undefined>()
  const [page, setPage] = useState(1)

  function handleSortingChange(updater: SortingState | ((old: SortingState) => SortingState)) {
    setSorting(updater)
    setPage(1)
  }

  function handleSearchChange(v: string) { setSearch(v); setPage(1) }
  function handleStatusChange(v: TicketStatus | undefined) { setStatusFilter(v); setPage(1) }
  function handleCategoryChange(v: TicketCategory | undefined) { setCategoryFilter(v); setPage(1) }
  function handleAssignedToIdChange(v: string | undefined) { setAssignedToIdFilter(v); setPage(1) }

  const queryParams: TicketQueryParams = {
    ...(sorting.length > 0 && {
      sortBy: sorting[0].id,
      sortOrder: sorting[0].desc ? 'desc' : 'asc',
    }),
    ...(search && { search }),
    ...(statusFilter !== undefined && { status: statusFilter }),
    ...(categoryFilter !== undefined && { category: categoryFilter }),
    ...(assignedToIdFilter !== undefined && { assignedToId: assignedToIdFilter }),
    page,
    pageSize: PAGE_SIZE,
  }

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ticketKeys.list(queryParams),
    queryFn: () => getTickets(queryParams),
  })

  const { data: agents = [] } = useQuery({
    queryKey: agentKeys.all,
    queryFn: getAgents,
  })

  const tickets = data?.tickets ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>

      <TicketFilters
        search={search}
        onSearchChange={handleSearchChange}
        status={statusFilter}
        onStatusChange={handleStatusChange}
        category={categoryFilter}
        onCategoryChange={handleCategoryChange}
        agents={agents}
        assignedToId={assignedToIdFilter}
        onAssignedToIdChange={handleAssignedToIdChange}
      />

      {fetchError && (
        <p className="text-sm text-destructive">{(fetchError as Error).message}</p>
      )}

      <TicketTable
        tickets={tickets}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />

      <TicketPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
