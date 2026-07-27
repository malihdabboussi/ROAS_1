'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AiUsageCharts } from '../components/AiUsageCharts'
import { AiUsageDateRangeControls } from '../components/AiUsageDateRangeControls'
import { AiUsageSummary } from '../components/AiUsageSummary'
import { AiUsageTables } from '../components/AiUsageTables'
import { ADMIN_AI_USAGE_MESSAGES } from '../config/messages.config'
import { loadAdminAiUsage } from '../services/admin-ai-usage.service'
import type { AdminAiUsageReport, AiUsageRange } from '../types/admin-ai-usage.types'

export function AdminAiUsageDashboard() {
  const [range, setRange] = useState<AiUsageRange>({ days: 7 })
  const [report, setReport] = useState<AdminAiUsageReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(
    async (force = false) => {
      setLoading(true)
      setError(false)
      try {
        setReport(await loadAdminAiUsage(range, force))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [range],
  )

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="p-spacing-4 md:p-spacing-6 lg:p-spacing-8 mx-auto w-full max-w-screen-2xl">
        <header className="gap-spacing-4 mb-spacing-6 flex flex-col justify-between md:flex-row md:items-end">
          <div>
            <p className="typo-section-label text-muted-foreground">ADMIN</p>
            <h1 className="title-h6 text-foreground mt-spacing-1">AI USAGE</h1>
            <p className="body-3 text-muted-foreground mt-spacing-2">
              Provider routing, trace coverage, spend, and token-efficiency gaps.
            </p>
          </div>
          <div className="gap-spacing-2 flex flex-col items-stretch md:items-end">
            <AiUsageDateRangeControls
              value={range}
              displayedRange={report?.range}
              onChange={setRange}
            />
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={loading}
              className="button-compact button-glass-neutral self-end"
            >
              <RefreshCw className={loading ? 'icon-sm animate-spin' : 'icon-sm'} />
              Refresh
            </button>
          </div>
        </header>

        {loading && !report ? (
          <div className="surface-card rounded-spacing-3 border-border p-spacing-8 body-3 text-muted-foreground border text-center">
            {ADMIN_AI_USAGE_MESSAGES.loading}
          </div>
        ) : error && !report ? (
          <div className="surface-card rounded-spacing-3 border-destructive p-spacing-8 body-3 text-destructive border text-center">
            {ADMIN_AI_USAGE_MESSAGES.error}
          </div>
        ) : report ? (
          <div className="gap-spacing-4 flex flex-col">
            <AiUsageCharts report={report} />
            <AiUsageSummary report={report} />
            <AiUsageTables report={report} />
            <p className="body-4 text-muted-foreground text-right">
              Updated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="surface-card rounded-spacing-3 border-border p-spacing-8 body-3 text-muted-foreground border text-center">
            {ADMIN_AI_USAGE_MESSAGES.empty}
          </div>
        )}
      </div>
    </div>
  )
}
