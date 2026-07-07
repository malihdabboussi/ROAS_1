import { createClient } from '@supabase/supabase-js'
import { MARKETING_AGENT_LIBRARY_FALLBACK } from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

export type MarketingHrGapSeverity = 'critical' | 'high' | 'medium'

export type MarketingHrInsightsData = {
  team_gaps: { gap: string; severity: MarketingHrGapSeverity; evidence: string }[]
  team_structure: { summary: string; strengths: string[]; improvements: string[] }
}

export type MarketingHrShowcasePayload = {
  hr: { name: string; imageUrl: string }
  insights: MarketingHrInsightsData
  nextHire: { roleKey: string; displayName: string; role: string; reason: string }
}

/** Headshot when `agent_employee_templates.image_url` for HR is missing (no row or empty). */
const HR_MARKETING_PORTRAIT_FALLBACK =
  'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-analyst-1774956098277.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWFuYWx5c3QtMTc3NDk1NjA5ODI3Ny5qcGciLCJpYXQiOjE3NzQ5NTYwOTksImV4cCI6MjA5MDMxNjA5OX0.znp5arS29L1StmOXwVDtKiJvN7w1SbIIzn4zN1mh8JA'

function hrPortraitOrFallback(url: unknown): string {
  if (url != null && String(url).trim() !== '') return String(url).trim()
  return HR_MARKETING_PORTRAIT_FALLBACK
}

/** Demo insights mirroring production `HrInsightsData` from campaign config / HR agent output. */
const DEMO_INSIGHTS: MarketingHrInsightsData = {
  team_gaps: [
    {
      gap: 'No dedicated analyst on active campaigns',
      severity: 'high',
      evidence:
        'Research and ICP work is falling back to strategists, slowing mission throughput.',
    },
    {
      gap: 'Creative capacity stretched',
      severity: 'medium',
      evidence:
        'Copy and design requests are queuing behind a single marketing specialist.',
    },
  ],
  team_structure: {
    summary:
      'Strong leadership and execution agents; add depth in research and creative production for parallel workstreams.',
    strengths: [
      'Clear PM coverage for marketing campaigns',
      'Developer in place for integrations and widgets',
    ],
    improvements: [
      'Add analyst for market and competitor intel',
      'Expand creative bench before the next launch spike',
    ],
  },
}

const HR_FALLBACK: MarketingHrShowcasePayload['hr'] = {
  name: 'Jordan',
  imageUrl: HR_MARKETING_PORTRAIT_FALLBACK,
}

export async function getMarketingHrShowcaseData(
  agents: PublicAgentLibraryRow[],
): Promise<MarketingHrShowcasePayload> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  let hr = HR_FALLBACK
  if (url && key) {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('agent_employee_templates')
      .select('default_name, image_url')
      .eq('role_key', 'hr')
      .maybeSingle()
    if (data?.default_name) {
      hr = {
        name: String(data.default_name),
        imageUrl: hrPortraitOrFallback(data.image_url),
      }
    }
  }

  const pool = agents.length > 0 ? agents : MARKETING_AGENT_LIBRARY_FALLBACK
  const next =
    pool.find((a) => a.role_key === 'analyst') ??
    pool.find((a) => a.role_key === 'copywriter') ??
    pool[0]

  if (!next) {
    return {
      hr,
      insights: DEMO_INSIGHTS,
      nextHire: {
        roleKey: 'analyst',
        displayName: 'Alex',
        role: 'Marketing Analyst',
        reason:
          'Fills the highest-impact gap so strategists stop covering deep research by hand.',
      },
    }
  }

  const reason =
    next.role_key === 'analyst'
      ? 'Adds dedicated research and competitive intelligence before the next campaign wave.'
      : `Strengthens ${next.role.toLowerCase()} capacity so your team can run missions in parallel.`

  return {
    hr,
    insights: DEMO_INSIGHTS,
    nextHire: {
      roleKey: next.role_key,
      displayName: next.default_name,
      role: next.role,
      reason,
    },
  }
}
