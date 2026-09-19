'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarDays, Download, ExternalLink, Eye, Loader2, Paperclip, X } from 'lucide-react'
import Header from '@/components/dashboard/Header'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchableSelect from '@/components/ui/searchable-select'
import {
  asList,
  dailyReportsApi,
  proxiedAssetUrl,
  usersApi,
  type DailyReport,
} from '@/lib/api/mobi-assur'
import { countExpectedMissingReports, toLocalIsoDate } from '@/lib/daily-reports'
import { toast } from 'sonner'

function initialDates() {
  const today = new Date()
  return {
    from_date: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to_date: toLocalIsoDate(today),
  }
}

export default function DailyReportsPage() {
  const t = useTranslations('dailyReports')
  const locale = useLocale()
  const [filters, setFilters] = useState<{
    from_date: string
    to_date: string
    status: '' | DailyReport['status']
    agent_id: string
  }>(() => ({ ...initialDates(), status: '', agent_id: '' }))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['admin-daily-reports', filters],
    queryFn: () =>
      dailyReportsApi.list({
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
        status: filters.status || undefined,
        agent_id: filters.agent_id || undefined,
      }),
    retry: 1,
  })
  const { data: agents = [] } = useQuery({
    queryKey: ['users', 'AGENT_TERRAIN'],
    queryFn: () => usersApi.list({ role: 'AGENT_TERRAIN' }),
  })
  const { data: submittedData } = useQuery({
    queryKey: ['admin-daily-reports', 'submitted-kpis', filters.from_date, filters.to_date, filters.agent_id],
    queryFn: () =>
      dailyReportsApi.list({
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
        status: 'SUBMITTED',
        agent_id: filters.agent_id || undefined,
      }),
  })
  const { data: selectedReport, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-daily-report', selectedId],
    queryFn: () => dailyReportsApi.get(selectedId!),
    enabled: Boolean(selectedId),
  })

  const reports = asList<DailyReport>(data)
  const submittedReports = asList<DailyReport>(submittedData)
  const submittedCount = new Set(
    submittedReports.map((report) => `${report.agent_id}:${report.report_date.slice(0, 10)}`),
  ).size
  const missingCount = countExpectedMissingReports({
    reports: submittedReports,
    fromDate: filters.from_date,
    toDate: filters.to_date,
    selectedAgentId: filters.agent_id,
    terrainAgentCount: agents.length,
  })

  const agentNames = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.full_name || agent.email || agent.id])),
    [agents],
  )
  const formatDate = (value?: string | null, withTime = false) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(locale, withTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' }).format(date)
  }
  const formatFcfa = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'XAF',
      maximumFractionDigits: 0,
    }).format(value)
  const downloadPdf = async (report: DailyReport) => {
    if (report.status !== 'SUBMITTED') return
    setDownloadingId(report.id)
    try {
      await dailyReportsApi.downloadPdf(report.id)
      toast.success(t('downloadSuccess'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('downloadError'))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <RoleGuard permission="agency:read">
      <div className="flex min-h-screen flex-col gap-6 bg-slate-50/50 p-6 md:p-8">
        <Header title={t('title')} subtitle={t('subtitle')} />

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{t('submitted')}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{submittedCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">{t('missing')}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{missingCount}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-700">{t('missingHint')}</p>
          </div>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">
            {t('fromDate')}
            <Input type="date" value={filters.from_date} onChange={(event) => setFilters((value) => ({ ...value, from_date: event.target.value }))} className="mt-1" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            {t('toDate')}
            <Input type="date" value={filters.to_date} onChange={(event) => setFilters((value) => ({ ...value, to_date: event.target.value }))} className="mt-1" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            {t('agent')}
            <div className="mt-1">
              <SearchableSelect value={filters.agent_id} onChange={(agent_id) => setFilters((value) => ({ ...value, agent_id }))} options={[{ value: '', label: t('allAgents') }, ...agents.map((agent) => ({ value: agent.id, label: agent.full_name || agent.email || agent.id }))]} />
            </div>
          </label>
          <label className="text-xs font-bold text-slate-600">
            {t('status')}
            <div className="mt-1">
              <SearchableSelect
                value={filters.status}
                onChange={(status) =>
                  setFilters((value) => ({
                    ...value,
                    status: status as '' | DailyReport['status'],
                  }))
                }
                options={[
                  { value: '', label: t('allStatuses') },
                  { value: 'DRAFT', label: t('statusDraft') },
                  { value: 'SUBMITTED', label: t('statusSubmitted') },
                ]}
              />
            </div>
          </label>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{t('loading')}</div>
          ) : isError ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-rose-700">{t('loadError')}</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
                {error instanceof Error ? error.message : t('empty')}
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                {t('retry')}
              </Button>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <CalendarDays className="mx-auto mb-3 h-10 w-10" />
              <p className="text-sm font-semibold">{t('empty')}</p>
              {(filters.from_date || filters.to_date || filters.status || filters.agent_id) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setFilters({ from_date: '', to_date: '', status: '', agent_id: '' })}
                >
                  {t('clearFilters')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4">{t('date')}</th>
                    <th className="p-4">{t('agent')}</th>
                    <th className="p-4">{t('status')}</th>
                    <th className="p-4 text-right">{t('visits')}</th>
                    <th className="p-4 text-right">{t('calls')}</th>
                    <th className="p-4 text-right">{t('prospects')}</th>
                    <th className="p-4 text-right">{t('contracts')}</th>
                    <th className="p-4 text-right">{t('collections')}</th>
                    <th className="p-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-900">{formatDate(report.report_date)}</td>
                      <td className="p-4 text-slate-700">{report.agent_name || agentNames.get(report.agent_id) || report.agent_id}</td>
                      <td className="p-4"><span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-700">{report.status}</span></td>
                      <td className="p-4 text-right font-semibold">{report.visits_count}</td>
                      <td className="p-4 text-right font-semibold">{report.calls_count}</td>
                      <td className="p-4 text-right font-semibold">{report.prospects_count}</td>
                      <td className="p-4 text-right font-semibold">{report.contracts_count}</td>
                      <td className="whitespace-nowrap p-4 text-right font-semibold text-emerald-700">{formatFcfa(report.collections_amount)}</td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedId(report.id)}><Eye className="h-3.5 w-3.5" />{t('view')}</Button>
                          {report.status === 'SUBMITTED' && (
                            <Button variant="outline" size="sm" disabled={downloadingId !== null} isLoading={downloadingId === report.id} onClick={() => downloadPdf(report)}><Download className="h-3.5 w-3.5" />PDF</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isFetching && !isLoading && <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">{t('refreshing')}</div>}
        </section>

        {selectedId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-black text-slate-900">{t('detailTitle')}</h2><p className="text-xs text-slate-500">{selectedReport ? `${formatDate(selectedReport.report_date)} · ${selectedReport.agent_name || agentNames.get(selectedReport.agent_id) || selectedReport.agent_id}` : ''}</p></div><Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} aria-label={t('close')}><X className="h-4 w-4" /></Button></div>
              {detailLoading || !selectedReport ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div> : (
                <div className="space-y-5 text-sm">
                  <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                    <p><strong>{t('status')}:</strong> {selectedReport.status}</p>
                    <p><strong>{t('submittedAt')}:</strong> {formatDate(selectedReport.submitted_at, true)}</p>
                    <p><strong>{t('lockedAt')}:</strong> {formatDate(selectedReport.locked_at, true)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      [t('visits'), selectedReport.visits_count],
                      [t('calls'), selectedReport.calls_count],
                      [t('prospects'), selectedReport.prospects_count],
                      [t('contracts'), selectedReport.contracts_count],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl border border-slate-100 p-3 text-center">
                        <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                        <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
                      </div>
                    ))}
                    <div className="col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-center sm:col-span-1">
                      <p className="text-[10px] font-bold uppercase text-emerald-700">{t('collections')}</p>
                      <p className="mt-1 whitespace-nowrap text-sm font-black text-emerald-900">{formatFcfa(selectedReport.collections_amount)}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="mb-2 font-bold text-slate-900">{t('difficulties')}</h3>
                      <p className="min-h-24 whitespace-pre-wrap rounded-xl border border-slate-100 p-4 leading-6 text-slate-700">{selectedReport.difficulties || '—'}</p>
                    </div>
                    <div>
                      <h3 className="mb-2 font-bold text-slate-900">{t('nextDayPlan')}</h3>
                      <p className="min-h-24 whitespace-pre-wrap rounded-xl border border-slate-100 p-4 leading-6 text-slate-700">{selectedReport.next_day_plan || '—'}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900"><Paperclip className="h-4 w-4" />{t('attachments')}</h3>
                    {(selectedReport.attachments ?? []).length ? (
                      <div className="space-y-2">
                        {(selectedReport.attachments ?? []).map((attachment) => (
                          <a key={attachment.id} href={proxiedAssetUrl(attachment.file_url)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-blue-700 hover:bg-blue-50">
                            <span className="truncate font-semibold">{attachment.file_name}</span>
                            <span className="ml-3 flex shrink-0 items-center gap-1 text-[10px] uppercase text-slate-500">{attachment.mime_type || t('file')}<ExternalLink className="h-3.5 w-3.5" /></span>
                          </a>
                        ))}
                      </div>
                    ) : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-slate-400">{t('noAttachments')}</p>}
                  </div>
                  {selectedReport.status === 'SUBMITTED' && (
                    <div className="flex justify-end"><Button onClick={() => downloadPdf(selectedReport)} disabled={downloadingId !== null} isLoading={downloadingId === selectedReport.id}><Download className="h-4 w-4" />{t('downloadPdf')}</Button></div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
