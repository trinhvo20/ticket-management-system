import { useQuery } from '@tanstack/react-query'
import { getTickets, ticketKeys } from '../lib/api'
import { TicketTable } from './TicketTable'

export function Tickets() {
  const {
    data: tickets = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ticketKeys.all,
    queryFn: getTickets,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
      {fetchError && (
        <p className="text-sm text-destructive">{(fetchError as Error).message}</p>
      )}
      <TicketTable tickets={tickets} isLoading={isLoading} />
    </div>
  )
}
