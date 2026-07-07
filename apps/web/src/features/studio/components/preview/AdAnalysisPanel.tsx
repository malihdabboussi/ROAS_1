'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  Brain,
  DollarSign,
  Lightbulb,
  Loader2,
  MessageSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchMetaAdsInsights, type MetaAdsInsightsSummary } from '../../services/analytics.service'
import { useChatStore } from '../../store/use-chat-store'

interface AdAnalysisPanelProps {
  campaignId: string
  campaignName?: string | null
}

interface AnalysisPrompt {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  buildPrompt: (summary: MetaAdsInsightsSummary, campaignName: string) => string
}

const ANALYSIS_PROMPTS: AnalysisPrompt[] = [
  {
    id: 'whats-working',
    label: "What's Working?",
    description: 'Identify top-performing ads and winning patterns',
    icon: <TrendingUp className="h-4 w-4" />,
    buildPrompt: (s, name) =>
      `Analyze my Meta ad campaign "${name}" and tell me what's working well.\n\n` +
      `Here are the current performance metrics:\n` +
      `- Spend: $${s.spend.toFixed(2)}\n` +
      `- Impressions: ${s.impressions.toLocaleString()}\n` +
      `- Reach: ${s.reach.toLocaleString()}\n` +
      `- Clicks: ${s.clicks.toLocaleString()}\n` +
      `- CTR: ${s.ctr.toFixed(2)}%\n` +
      `- CPC: $${s.cpc.toFixed(2)}\n` +
      `- CPM: $${s.cpm.toFixed(2)}\n` +
      `- Leads: ${s.leads}\n` +
      `- ROAS: ${s.roas.toFixed(2)}x\n\n` +
      `What patterns do you see? What's driving the best results? What should I double down on?`,
  },
  {
    id: 'needs-improvement',
    label: 'What Needs Improvement?',
    description: 'Find underperforming ads and get suggestions',
    icon: <TrendingDown className="h-4 w-4" />,
    buildPrompt: (s, name) =>
      `Look at my Meta ad campaign "${name}" and identify what needs improvement.\n\n` +
      `Current metrics:\n` +
      `- Spend: $${s.spend.toFixed(2)}\n` +
      `- CTR: ${s.ctr.toFixed(2)}%\n` +
      `- CPC: $${s.cpc.toFixed(2)}\n` +
      `- CPM: $${s.cpm.toFixed(2)}\n` +
      `- Leads: ${s.leads}\n` +
      `- ROAS: ${s.roas.toFixed(2)}x\n` +
      `- Conversions: ${s.conversions}\n\n` +
      `What's underperforming? What specific changes would you recommend to improve results?`,
  },
  {
    id: 'creative-feedback',
    label: 'Creative Feedback',
    description: 'Get copy, imagery, and CTA suggestions',
    icon: <Sparkles className="h-4 w-4" />,
    buildPrompt: (s, name) =>
      `Review the creative performance for my campaign "${name}" and give me feedback.\n\n` +
      `Performance context:\n` +
      `- CTR: ${s.ctr.toFixed(2)}% (${s.ctr >= 1.5 ? 'above' : 'below'} average)\n` +
      `- CPC: $${s.cpc.toFixed(2)}\n` +
      `- ${s.clicks.toLocaleString()} clicks from ${s.impressions.toLocaleString()} impressions\n\n` +
      `Based on these numbers, what creative changes would improve engagement? ` +
      `Give me specific suggestions for headlines, copy, imagery, and CTAs.`,
  },
  {
    id: 'audience-insights',
    label: 'Audience Insights',
    description: 'Analyze targeting and suggest new audiences',
    icon: <Users className="h-4 w-4" />,
    buildPrompt: (s, name) =>
      `Analyze the audience performance for my campaign "${name}".\n\n` +
      `Current performance:\n` +
      `- Reach: ${s.reach.toLocaleString()}\n` +
      `- Impressions: ${s.impressions.toLocaleString()} (frequency: ${s.reach > 0 ? (s.impressions / s.reach).toFixed(1) : 'N/A'}x)\n` +
      `- CTR: ${s.ctr.toFixed(2)}%\n` +
      `- CPC: $${s.cpc.toFixed(2)}\n` +
      `- Cost per result: $${s.cost_per_result.toFixed(2)}\n\n` +
      `What does this tell us about audience fit? Are we reaching the right people? ` +
      `Suggest audience refinements or new audiences to test.`,
  },
  {
    id: 'budget-optimization',
    label: 'Budget Optimization',
    description: 'Optimize spend distribution and allocation',
    icon: <DollarSign className="h-4 w-4" />,
    buildPrompt: (s, name) =>
      `Help me optimize the budget for my campaign "${name}".\n\n` +
      `Current spend breakdown:\n` +
      `- Total spend: $${s.spend.toFixed(2)}\n` +
      `- Impressions: ${s.impressions.toLocaleString()}\n` +
      `- CPM: $${s.cpm.toFixed(2)}\n` +
      `- CPC: $${s.cpc.toFixed(2)}\n` +
      `- ROAS: ${s.roas.toFixed(2)}x\n` +
      `- Revenue: $${s.revenue.toFixed(2)}\n\n` +
      `Am I spending efficiently? Should I reallocate budget between ad sets? ` +
      `What's the optimal daily budget to maximize ROAS?`,
  },
  {
    id: 'generate-variations',
    label: 'Generate Variations',
    description: 'Create new ad concepts based on winners',
    icon: <Lightbulb className="h-4 w-4" />,
    buildPrompt: (s, name) =>
      `Based on the performance of my campaign "${name}", generate new ad variation ideas.\n\n` +
      `Performance summary:\n` +
      `- Best CTR: ${s.ctr.toFixed(2)}%\n` +
      `- ROAS: ${s.roas.toFixed(2)}x\n` +
      `- ${s.leads} leads from $${s.spend.toFixed(2)} spend\n\n` +
      `Create 3-5 new ad concepts that build on what's working. ` +
      `For each, give me: headline, primary text, description, and CTA. ` +
      `Make them distinct but inspired by the winning patterns.`,
  },
]

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="card-glass rounded-xl p-3">
      <p className="typo-caption text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-foreground text-lg font-semibold">{value}</p>
        {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-400" />}
        {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
      </div>
    </div>
  )
}

function evaluateMetricTrend(
  ctr: number,
  roas: number,
): { ctr: 'up' | 'down' | 'neutral'; roas: 'up' | 'down' | 'neutral' } {
  return {
    ctr: ctr >= 1.5 ? 'up' : ctr >= 0.8 ? 'neutral' : 'down',
    roas: roas >= 2 ? 'up' : roas >= 1 ? 'neutral' : 'down',
  }
}

export function AdAnalysisPanel({ campaignId, campaignName }: AdAnalysisPanelProps) {
  const [summary, setSummary] = useState<MetaAdsInsightsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const setPendingComposerText = useChatStore((s) => s.setPendingComposerText)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMetaAdsInsights({ campaignId, level: 'campaign' })
      .then((data) => {
        if (!cancelled) setSummary(data.summary)
      })
      .catch((err) => {
        console.error('[AdAnalysisPanel] Failed to load insights:', err)
        if (!cancelled) setSummary(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  const handlePromptClick = useCallback(
    (prompt: AnalysisPrompt) => {
      if (!summary) {
        toast.error('No performance data available to analyze.')
        return
      }
      const text = prompt.buildPrompt(summary, campaignName ?? 'My Campaign')
      setPendingComposerText(text)
      toast.success('Analysis prompt loaded — send it in the chat to get insights.')
    },
    [summary, campaignName, setPendingComposerText],
  )

  if (loading) {
    return (
      <div className="card-glass flex items-center justify-center rounded-2xl p-8">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!summary || summary.impressions === 0) {
    return (
      <div className="card-glass rounded-2xl p-6 text-center">
        <BarChart3 className="text-muted-foreground/30 mx-auto mb-2 h-8 w-8" />
        <p className="body-3 text-muted-foreground">No performance data yet</p>
        <p className="typo-caption text-muted-foreground mt-1">
          Sync your Meta ads or publish ads to see analytics and get AI analysis.
        </p>
      </div>
    )
  }

  const trends = evaluateMetricTrend(summary.ctr, summary.roas)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Spend" value={`$${summary.spend.toFixed(2)}`} />
        <MetricCard label="Impressions" value={summary.impressions.toLocaleString()} />
        <MetricCard label="Reach" value={summary.reach.toLocaleString()} />
        <MetricCard label="Clicks" value={summary.clicks.toLocaleString()} />
        <MetricCard label="CTR" value={`${summary.ctr.toFixed(2)}%`} trend={trends.ctr} />
        <MetricCard label="CPC" value={`$${summary.cpc.toFixed(2)}`} />
        <MetricCard label="ROAS" value={`${summary.roas.toFixed(2)}x`} trend={trends.roas} />
        <MetricCard label="Leads" value={summary.leads.toLocaleString()} />
      </div>

      <div className="card-glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-green-400" />
          <p className="body-2 text-foreground font-medium">AI ANALYSIS</p>
        </div>
        <p className="body-3 text-muted-foreground mb-4">
          Choose an analysis type below. The prompt will be loaded into your chat — send it to get
          AI-powered insights on your ad performance.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ANALYSIS_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => handlePromptClick(prompt)}
              className="card-glass group flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-green-500/5"
            >
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-400 transition-colors group-hover:bg-green-500/20">
                {prompt.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="body-3 text-foreground font-medium">{prompt.label}</p>
                <p className="typo-caption text-muted-foreground">{prompt.description}</p>
              </div>
              <MessageSquare className="text-muted-foreground/40 mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
