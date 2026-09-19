import type { DailyReport } from '@/lib/api/mobi-assur'

/** Date calendaire locale (évite le décalage UTC qui excluait le jour courant). */
export function toLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function utcDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(timestamp) ? null : timestamp
}

export function countCalendarDaysInclusive(fromDate: string, toDate: string): number {
  const from = utcDate(fromDate)
  const to = utcDate(toDate)
  if (from == null || to == null || to < from) return 0
  return Math.floor((to - from) / 86_400_000) + 1
}

export function countExpectedMissingReports({
  reports,
  fromDate,
  toDate,
  selectedAgentId,
  terrainAgentCount,
}: {
  reports: DailyReport[]
  fromDate: string
  toDate: string
  selectedAgentId?: string
  terrainAgentCount: number
}): number {
  const agentCount = selectedAgentId ? 1 : Math.max(0, terrainAgentCount)
  const expected = agentCount * countCalendarDaysInclusive(fromDate, toDate)
  const submittedPairs = new Set(
    reports
      .filter((report) => report.status === 'SUBMITTED')
      .map((report) => `${report.agent_id}:${report.report_date.slice(0, 10)}`),
  )
  return Math.max(0, expected - submittedPairs.size)
}
