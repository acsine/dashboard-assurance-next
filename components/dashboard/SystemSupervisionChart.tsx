'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemApi, SystemHealthData, SystemHealthService } from '@/lib/api/mobi-assur'
import {
  Activity,
  ShieldCheck,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  Server,
  Database,
  Smartphone,
  Cpu,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface HistoryPoint {
  time: string
  latency: number
  status: 'healthy' | 'degraded' | 'unhealthy'
}

export default function SystemSupervisionChart() {
  const t = useTranslations('chart')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [hoveredPoint, setHoveredPoint] = useState<HistoryPoint | null>(null)

  const {
    data: health,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<SystemHealthData>({
    queryKey: ['system-health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 15000, // 15 seconds live telemetry refresh
    staleTime: 10000,
  })

  // Update history buffer on new health data
  useEffect(() => {
    if (health) {
      const nowStr = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      setHistory((prev) => {
        const next = [...prev, { time: nowStr, latency: health.overall_latency_ms, status: health.status }]
        return next.slice(-10) // keep last 10 points
      })
    }
  }, [health])

  // SVG Area Chart calculations
  const maxLatency = Math.max(...history.map((h) => h.latency), 100)
  const minLatency = Math.min(...history.map((h) => h.latency), 10)
  const svgWidth = 400
  const svgHeight = 90
  const paddingX = 10
  const paddingY = 15

  const pointsCoords = history.map((pt, idx) => {
    const x =
      paddingX + (idx / Math.max(history.length - 1, 1)) * (svgWidth - paddingX * 2)
    const normalizedY =
      maxLatency === minLatency
        ? 0.5
        : (pt.latency - minLatency) / (maxLatency - minLatency)
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2)
    return { x, y, pt }
  })

  // Generate SVG path strings
  const pathD = pointsCoords.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x},${point.y}`
    const prev = pointsCoords[i - 1]
    const cx = (prev.x + point.x) / 2
    return `${acc} C ${cx},${prev.y} ${cx},${point.y} ${point.x},${point.y}`
  }, '')

  const areaD =
    pointsCoords.length > 0
      ? `${pathD} L ${pointsCoords[pointsCoords.length - 1].x},${svgHeight} L ${pointsCoords[0].x},${svgHeight} Z`
      : ''

  const getServiceIcon = (key: string) => {
    switch (key) {
      case 'gateway':
        return Server
      case 'cima_generator':
        return Zap
      case 'mobile_sync':
        return Smartphone
      case 'database':
        return Database
      default:
        return Cpu
    }
  }

  const getStatusBadge = (status: SystemHealthService['status']) => {
    switch (status) {
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Opérationnel
          </span>
        )
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Latence Elevée
          </span>
        )
      case 'down':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            Hors Service
          </span>
        )
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 flex flex-col justify-between space-y-6">
      {/* Header section */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-2">
                {t('title')}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200">
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  Live API
                </span>
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Télémétrie en temps réel et latence backend
              </p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 rounded-xl transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
            title="Rafraîchir le test de latence"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isRefetching ? 'Pinging...' : 'Tester'}</span>
          </button>
        </div>

        {/* Dynamic Telemetry Graph Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950 text-white relative overflow-hidden border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Latence Backend (Ping API)
              </span>
              {isLoading ? (
                <div role="status" aria-label="Mesure de la latence backend" className="flex items-baseline gap-2 mt-1.5">
                  <span className="block h-6 w-20 rounded-md bg-slate-800 animate-pulse" />
                  <span className="block h-3 w-24 rounded bg-slate-800/70 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {health?.overall_latency_ms ?? '—'} <span className="text-xs text-emerald-400 font-bold">ms</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    (Uptime {health?.uptime_percentage ?? '—'}%)
                  </span>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {health?.status === 'healthy'
                  ? 'Système Normal'
                  : health?.status === 'degraded'
                  ? 'Latence Détectée'
                  : 'Backend Non Joignable'}
              </span>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">
                Rafraîchissement auto / 15s
              </p>
            </div>
          </div>

          {/* SVG Smooth Area Chart */}
          <div className="relative h-[90px] w-full mt-2">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-[1px]">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-300">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                  Relevé de la télémétrie…
                </span>
              </div>
            )}
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line
                x1="0"
                y1={svgHeight - paddingY}
                x2={svgWidth}
                y2={svgHeight - paddingY}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
              <line
                x1="0"
                y1={paddingY}
                x2={svgWidth}
                y2={paddingY}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />

              {/* Filled Gradient Area */}
              {areaD && <path d={areaD} fill="url(#latencyGradient)" />}

              {/* Smooth Spline Curve */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Data points & hover detection */}
              {pointsCoords.map((pt, idx) => {
                const isLast = idx === pointsCoords.length - 1
                return (
                  <g key={idx} className="cursor-pointer">
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isLast ? '5' : '3.5'}
                      className={`${
                        isLast
                          ? 'fill-emerald-400 stroke-slate-950 stroke-2 animate-pulse'
                          : 'fill-blue-400 opacity-70 hover:opacity-100 transition-all'
                      }`}
                      onMouseEnter={() => setHoveredPoint(pt.pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                )
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-md text-[10px] text-slate-200 shadow-lg pointer-events-none z-10 flex items-center gap-2 font-mono">
                <span className="text-emerald-400 font-bold">{hoveredPoint.latency} ms</span>
                <span className="text-slate-500">|</span>
                <span>{hoveredPoint.time}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Service Status List */}
        <div className="mt-5 space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`service-skeleton-${index}`}
                role="status"
                aria-label="Chargement de l'état des services"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
                    <div className="h-2.5 w-28 rounded bg-slate-100 animate-pulse" />
                  </div>
                </div>
                <div className="h-5 w-24 rounded-full bg-slate-100 animate-pulse shrink-0" />
              </div>
            ))}

          {!isLoading && !health?.services?.length && (
            <p className="py-6 text-center text-xs font-semibold text-slate-400">
              État des services indisponible pour le moment.
            </p>
          )}

          {(health?.services ?? []).map((service) => {
            const Icon = getServiceIcon(service.key)
            return (
              <div
                key={service.key}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-200/70 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-none">
                      {service.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-slate-500">
                        Latence: <span className="font-bold text-slate-800">{service.latency_ms} ms</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Dispo: <span className="font-bold text-slate-800">{service.uptime_pct}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">{getStatusBadge(service.status)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Certification footer banner */}
      <div className="p-4 bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 rounded-xl border border-blue-200/80 shadow-2xs flex items-start gap-3">
        <div className="bg-blue-600 text-white p-2 rounded-lg shrink-0 shadow-2xs">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-slate-900">
            Bethel Insurance Platform
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-medium">
            Système d'information certifié conforme au Code de la CIMA pour la souscription,
            la tarification et l'instruction des sinistres.
          </p>
        </div>
      </div>
    </div>
  )
}
