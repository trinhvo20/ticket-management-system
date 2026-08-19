import { TicketStatus, TicketCategory, type Agent } from '@ticket/core'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

const UNASSIGNED_VALUE = 'unassigned'

const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.Open]: 'Open',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.GeneralQuestion]: 'General Question',
  [TicketCategory.TechnicalQuestion]: 'Technical Question',
  [TicketCategory.RefundRequest]: 'Refund Request',
}

interface TicketFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: TicketStatus | undefined
  onStatusChange: (value: TicketStatus | undefined) => void
  category: TicketCategory | undefined
  onCategoryChange: (value: TicketCategory | undefined) => void
  agents: Agent[]
  assignedToId: string | undefined
  onAssignedToIdChange: (value: string | undefined) => void
}

export function TicketFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  agents,
  assignedToId,
  onAssignedToIdChange,
}: TicketFiltersProps) {
  const hasFilters =
    search !== '' || status !== undefined || category !== undefined || assignedToId !== undefined

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by subject…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select
        value={status ?? ''}
        onValueChange={(v) => onStatusChange(v === '' ? undefined : v as TicketStatus)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(TicketStatus).map((s) => (
            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={category ?? ''}
        onValueChange={(v) => onCategoryChange(v === '' ? undefined : v as TicketCategory)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(TicketCategory).map((c) => (
            <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={assignedToId ?? ''}
        onValueChange={(v) => onAssignedToIdChange(v === '' ? undefined : v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange('')
            onStatusChange(undefined)
            onCategoryChange(undefined)
            onAssignedToIdChange(undefined)
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
