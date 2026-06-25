import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { getTickets, ticketKeys } from '../lib/api'
import type { TicketSortParams } from '../lib/api'
import { TicketTable } from './TicketTable'

export function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([])

  const sortParams: TicketSortParams =
    sorting.length > 0
      ? { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }
      : {}

  const {
    data: tickets = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ticketKeys.list(sortParams),
    queryFn: () => getTickets(sortParams),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
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
