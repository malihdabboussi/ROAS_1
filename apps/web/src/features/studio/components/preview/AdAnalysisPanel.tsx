'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Brain,
  Check,
  DollarSign,
  Lightbulb,
  MessageSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import { ADS_ANALYSIS_MESSAGES } from '@/features/studio/config/ads-analysis.messages.config'
import type { MetaAdsInsightsRow } from '../../services/analytics.service'
import {
  buildBlazeAnalysisPrompt,
  type AnalysisId,
} from './meta-ads-analysis'

interface AdAnalysisPanelProps {
  campaignId: string
  campaignName?: string | null
  campaignRows: MetaAdsInsightsRow[]
  timeRangeLabel: string
}

interface AnalysisPrompt {
  id: AnalysisId
  label: string
  description: string
  icon: ReactNode
}

const ANALYSIS_PROMPTS: AnalysisPrompt[] = [
  {
    id: 'whats-working',
    label: "What's Working?",
    description: 'Identify top-performing ads and winning patterns',
    icon: <TrendingUp className="icon-sm" />,
  },
  {
    id: 'needs-improvement',
    label: 'What Needs Improvement?',
    description: 'Find underperforming ads and get suggestions',
    icon: <TrendingDown className="icon-sm" />,
  },
  {
    id: 'creative-feedback',
    label: 'Creative Feedback',
    description: 'Get creative testing recommendations',
    icon: <Sparkles className="icon-sm" />,
  },
  {
    id: 'audience-insights',
    label: 'Audience Insights',
    description: 'Analyze targeting and suggest new audiences',
    icon: <Users className="icon-sm" />,
  },
  {
    id: 'budget-optimization',
    label: 'Budget Optimization',
    description: 'Optimize spend distribution and allocation',
    icon: <DollarSign className="icon-sm" />,
  },
  {
    id: 'generate-variations',
    label: 'Generate Variations',
    description: 'Plan new ad concepts based on winners',
    icon: <Lightbulb className="icon-sm" />,
  },
]

function summarizeRows(rows: MetaAdsInsightsRow[]) {
  const spend = rows.reduce((sum, row) => sum + row.spend, 0)
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0)
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0)
  const results = rows.reduce((sum, row) => sum + row.results, 0)
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  return {
    spend,
    impressions,
    clicks,
    results,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    roas: spend > 0 ? revenue / spend : 0,
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-glass rounded-spacing-3 p-spacing-3">
      <p className="typo-caption text-muted-foreground">{label}</p>
      <p className="title-h6 text-foreground">{value}</p>
    </div>
  )
}

export function AdAnalysisPanel({
  campaignId,
  campaignName,
  campaignRows,
  timeRangeLabel,
}: AdAnalysisPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(campaignRows.map((row) => row.id)),
  )
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const openFreshChatDrawer = useShellStore((state) => state.openFreshChatDrawer)

  useEffect(() => {
    setSelectedIds(new Set(campaignRows.map((row) => row.id)))
  }, [campaignRows])

  const selectedRows = useMemo(
    () => campaignRows.filter((row) => selectedIds.has(row.id)),
    [campaignRows, selectedIds],
  )
  const summary = useMemo(() => summarizeRows(selectedRows), [selectedRows])

  const toggleCampaign = useCallback((rowId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }, [])

  const handlePromptClick = useCallback(
    (analysisId: AnalysisId) => {
      if (selectedRows.length === 0) {
        toast.error(ADS_ANALYSIS_MESSAGES.NO_CAMPAIGNS)
        return
      }
      const content = buildBlazeAnalysisPrompt({
        analysisId,
        workspaceName: campaignName ?? 'this workspace',
        timeRangeLabel,
        rows: selectedRows,
      })
      openFreshChatDrawer()
      seedComposer({
        content,
        agentKey: 'ads_manager',
        railIntent: 'new',
        workContext: { surface: 'spaces', campaignId },
      })
      toast.success(ADS_ANALYSIS_MESSAGES.STARTED)
    }, [campaignId, campaignName, openFreshChatDrawer, seedComposer, selectedRows, timeRangeLabel],
  )

  if (campaignRows.length === 0) return null

  return (
    <div className="space-y-spacing-4">
      <div className="card-glass rounded-spacing-3 p-spacing-4">
        <div className="mb-spacing-3 flex items-center justify-between">
          <div>
            <p className="body-2 text-foreground font-medium">CAMPAIGNS TO REVIEW</p>
            <p className="typo-caption text-muted-foreground">{timeRangeLabel}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedIds(
                selectedIds.size === campaignRows.length
                  ? new Set()
                  : new Set(campaignRows.map((row) => row.id)),
              )
            }
            className="button-compact button-glass-neutral"
          >
            {selectedIds.size === campaignRows.length ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <div className="gap-spacing-2 flex flex-wrap">
          {campaignRows.map((row) => {
            const selected = selectedIds.has(row.id)
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => toggleCampaign(row.id)}
                aria-pressed={selected}
                className={
                  selected
                    ? 'button-compact button-glass-primary gap-spacing-1'
                    : 'button-compact button-glass-neutral gap-spacing-1'
                }
              >
                {selected ? <Check className="icon-xs" /> : null}
                <span className="max-w-56 truncate">{row.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-spacing-3 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Spend" value={`$${summary.spend.toFixed(2)}`} />
        <MetricCard label="Impressions" value={summary.impressions.toLocaleString()} />
        <MetricCard label="Clicks" value={summary.clicks.toLocaleString()} />
        <MetricCard label="Results" value={summary.results.toLocaleString()} />
        <MetricCard label="CTR" value={`${summary.ctr.toFixed(2)}%`} />
        <MetricCard label="Purchase ROAS" value={`${summary.roas.toFixed(2)}x`} />
      </div>

      <div className="card-glass rounded-spacing-3 p-spacing-4">
        <div className="mb-spacing-2 gap-spacing-2 flex items-center">
          <Brain className="icon-md text-primary" />
          <p className="body-2 text-foreground font-medium">AI ANALYSIS WITH BLAZE</p>
        </div>
        <p className="body-3 text-muted-foreground mb-spacing-4">
          Choose an analysis. Blaze will open in chat and review only the campaigns selected above.
        </p>
        <div className="grid gap-spacing-2 sm:grid-cols-2 lg:grid-cols-3">
          {ANALYSIS_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => handlePromptClick(prompt.id)}
              className="surface-card border-border hover:bg-hover-subtle gap-spacing-3 rounded-spacing-3 p-spacing-3 flex items-start border text-left"
            >
              <span className="bg-primary/10 text-primary rounded-spacing-2 p-spacing-2">
                {prompt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="body-3 text-foreground block font-medium">{prompt.label}</span>
                <span className="typo-caption text-muted-foreground block">{prompt.description}</span>
              </span>
              <MessageSquare className="icon-xs text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
