import type { ToolStep } from './openclaw-proxy.service'

const CAMPAIGN_SIGNAL = /\b(campaign|ads?|ad spend|roas|leads?|conversions?|performance)\b/i
const STATUS_SIGNAL =
  /\b(status|perform(?:ance|ing)?|doing|results?|metrics?|numbers?|health|live|today|this week|current|right now)\b/i
const CREATION_SIGNAL = /\b(create|write|draft|build|design|launch|make)\b/i

export function isCampaignStatusRequest(text: string): boolean {
  const normalized = text.trim()
  return (
    CAMPAIGN_SIGNAL.test(normalized) &&
    STATUS_SIGNAL.test(normalized) &&
    !CREATION_SIGNAL.test(normalized)
  )
}

export function formatCampaignIntelligenceResearch(
  campaignId: string,
  toolSteps: ToolStep[],
): string {
  const byAction = new Map(toolSteps.map((step) => [step.action ?? step.name, step]))
  return JSON.stringify({
    purpose: 'campaign_status',
    campaign_id: campaignId,
    routing_contract: {
      canonical_source: 'campaign_reporting',
      as_of: readAsOf(byAction.get('get_campaign_main_dashboard')?.result),
      evidence: toolSteps.map((step) => ({
        action: step.action ?? step.name,
        status: step.status,
        error: step.error ?? null,
      })),
      brain_context: byAction.get('search_campaign_brain')?.result ?? null,
    },
    live_campaign_dashboard: byAction.get('get_campaign_main_dashboard')?.result ?? null,
    open_campaign_tasks: byAction.get('list_tasks')?.result ?? null,
    instructions:
      'Answer from live_campaign_dashboard for mutable metrics. Use brain_context only for durable decisions and conversational interpretation. State the source and as-of time. Call out missing or failed evidence instead of guessing.',
  })
}

function readAsOf(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  for (const key of ['as_of', 'fetched_at', 'generated_at']) {
    if (typeof record[key] === 'string') return record[key]
  }
  return null
}
