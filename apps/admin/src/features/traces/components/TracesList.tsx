'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronRight, CircleCheck, CircleX, Clock, Copy } from 'lucide-react'
import { formatAgentKeyDisplay } from '@/lib/format-agent-key-display'
import { adminGet } from '@/lib/api/admin-client'
import { formatTraceChannel } from '../lib/format-trace-channel'
import type { AgentTrace, AgentTraceSummary } from '../types/agent-trace.types'
import { TraceSlidePanel } from './TraceSlidePanel'

interface TracesListProps {
  traces: AgentTraceSummary[]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function durationColorClass(ms: number | null): string {
  if (ms == null) return 'text-muted-foreground'
  if (ms < 2000) return 'text-success'
  if (ms < 5000) return 'text-warning'
  return 'text-destructive'
}

function StatusIcon({ status }: { status: AgentTraceSummary['status'] }) {
  if (status === 'completed') return <CircleCheck className="icon-sm text-success" />
  if (status === 'failed') return <CircleX className="icon-sm text-destructive" />
  return <Clock className="icon-sm animate-pulse text-warning" />
}

function formatToolStepName(step: NonNullable<AgentTraceSummary['tool_steps']>[number]): string {
  return step.action ? `${step.name}:${step.action}` : step.name
}

export function TracesList({ traces }: TracesListProps) {
  const [selectedSummary, setSelectedSummary] = useState<AgentTraceSummary | null>(null)
  const [detail, setDetail] = useState<AgentTrace | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [copiedTraceId, setCopiedTraceId] = useState<string | null>(null)

  const loadDetail = useCallback(async (traceId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)
    try {
      const full = await adminGet<AgentTrace>(`traces/${traceId}`)
      setDetail(full)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load trace detail')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const openTrace = useCallback(
    (summary: AgentTraceSummary) => {
      setSelectedSummary(summary)
      void loadDetail(summary.id)
    },
    [loadDetail],
  )

  const closePanel = useCallback(() => {
    setSelectedSummary(null)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(false)
  }, [])

  useEffect(() => {
    if (!selectedSummary) return
    const next = traces.find((t) => t.id === selectedSummary.id)
    if (next) {
      setSelectedSummary(next)
    } else {
      closePanel()
    }
  }, [traces, selectedSummary?.id, closePanel])

  return (
    <>
      <div className="section-card rounded-spacing-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/30 border-b text-left">
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 w-8 font-medium" />
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  Time
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  User
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  Agent
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  Channel
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  User Message
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  Tools
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  Tokens
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  Duration
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-medium">
                  Status
                </th>
                <th className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 w-28 whitespace-nowrap font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {traces.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="body-3 text-muted-foreground px-spacing-3 py-spacing-12 text-center"
                  >
                    No traces yet. Chat activity will appear here once traces are recorded.
                  </td>
                </tr>
              ) : (
                traces.map((trace) => {
                  const steps = trace.tool_steps ?? []
                  const toolsSummary =
                    steps.length === 0
                      ? '—'
                      : steps.length === 1
                        ? (steps[0] ? formatToolStepName(steps[0]) : '—')
                        : `${steps.map(formatToolStepName).join(', ')} (${steps.length})`

                  return (
                    <tr
                      key={trace.id}
                      className="hover:bg-hover-subtle cursor-pointer transition-colors"
                      onClick={() => openTrace(trace)}
                    >
                      <td className="px-spacing-3 py-spacing-2">
                        <ChevronRight className="icon-sm text-muted-foreground" />
                      </td>
                      <td className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 whitespace-nowrap font-mono text-xs">
                        {formatTime(trace.created_at)}
                      </td>
                      <td className="body-4 text-foreground px-spacing-3 py-spacing-2 max-w-[10rem] truncate text-xs">
                        {trace.user_display_name?.trim() ? trace.user_display_name : '—'}
                      </td>
                      <td className="body-4 text-foreground px-spacing-3 py-spacing-2 whitespace-nowrap text-xs">
                        {formatAgentKeyDisplay(trace.gateway_agent_id ?? trace.agent_key)}
                      </td>
                      <td className="body-4 text-foreground px-spacing-3 py-spacing-2 whitespace-nowrap text-xs">
                        {formatTraceChannel(trace.channel)}
                      </td>
                      <td className="body-3 text-foreground px-spacing-3 py-spacing-2 max-w-xs truncate">
                        {trace.user_message.slice(0, 80)}
                        {trace.user_message.length > 80 ? '…' : ''}
                      </td>
                      <td className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 text-xs">
                        {toolsSummary}
                      </td>
                      <td className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 font-mono text-xs">
                        {trace.total_tokens != null ? trace.total_tokens.toLocaleString() : '—'}
                      </td>
                      <td className="px-spacing-3 py-spacing-2">
                        <span
                          className={`font-mono text-xs font-medium ${durationColorClass(trace.duration_ms)}`}
                        >
                          {formatDuration(trace.duration_ms)}
                        </span>
                      </td>
                      <td className="px-spacing-3 py-spacing-2">
                        <span className="gap-spacing-2 flex items-center">
                          <StatusIcon status={trace.status} />
                          <span className="body-4 capitalize">{trace.status}</span>
                        </span>
                      </td>
                      <td className="px-spacing-3 py-spacing-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void navigator.clipboard.writeText(trace.id).then(() => {
                              setCopiedTraceId(trace.id)
                              window.setTimeout(() => setCopiedTraceId((id) => (id === trace.id ? null : id)), 2000)
                            })
                          }}
                          className="button-glass-neutral body-4 gap-spacing-1 rounded-spacing-2 px-spacing-2 py-spacing-1 hover:bg-hover-subtle text-foreground inline-flex items-center font-medium transition-colors"
                        >
                          {copiedTraceId === trace.id ? (
                            <Check className="icon-sm text-success" aria-hidden />
                          ) : (
                            <Copy className="icon-sm" aria-hidden />
                          )}
                          {copiedTraceId === trace.id ? 'Copied' : 'Copy ID'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <TraceSlidePanel
        summary={selectedSummary}
        detail={detail}
        detailLoading={detailLoading}
        detailError={detailError}
        onClose={closePanel}
        onRetry={() => selectedSummary && void loadDetail(selectedSummary.id)}
      />
    </>
  )
}
