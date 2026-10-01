export interface DailyTicketCount {
  date: string
  count: number
}

export interface DashboardStats {
  total: number
  open: number
  resolvedByAi: number
  pctResolvedByAi: number
  avgResolutionTimeMs: number | null
  dailyCounts: DailyTicketCount[]
}
