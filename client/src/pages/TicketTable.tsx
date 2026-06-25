import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import type { SortingState, OnChangeFn } from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Link } from 'react-router'
import type { Ticket } from '../lib/api'
import { StatusBadge, formatCategory } from '../lib/ticket-utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'


const columnHelper = createColumnHelper<Ticket>()

const columns = [
columnHelper.accessor('subject', {
    header: 'Subject',
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-medium text-link"
      >
        {row.original.subject}
      </Link>
    ),
  }),
  columnHelper.accessor('fromName', {
    header: 'From',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        <div>{row.original.fromName}</div>
        <div className="text-xs">{row.original.fromEmail}</div>
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    enableSorting: true,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    enableSorting: true,
    cell: (info) => (
      <span className="text-muted-foreground">{formatCategory(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('createdAt', {
    id: 'createdAt',
    header: 'Received',
    enableSorting: true,
    cell: (info) => (
      <span className="text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
]

interface TicketTableProps {
  tickets: Ticket[]
  isLoading: boolean
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}

export function TicketTable({ tickets, isLoading, sorting, onSortingChange }: TicketTableProps) {
  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  })

  if (isLoading) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Subject</TableHead>
              <TableHead className="px-4">From</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Category</TableHead>
              <TableHead className="px-4">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="px-4"><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell className="px-4"><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="px-4"
                >
                  {header.column.getCanSort() ? (
                    <button
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="px-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                No tickets yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
