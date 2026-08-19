import Link from 'next/link'
import { Check, Users, X } from 'lucide-react'
import { CHAT_MARKDOWN_CLASSNAME, renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'

interface QualityEvalPayload {
  qualityScore?: number
  dimensionScores?: Record<string, number>
  dynamicRubric?: Array<{ criterion: string; score: number; evidence: string }>
  strengths?: string[]
  weaknesses?: string[]
  claimsVerification?: Array<{ claim: string; verified: boolean; evidence: string }>
}

const DIMENSION_LABELS: Record<string, string> = {
  intent_alignment: 'Intent',
  craft: 'Craft',
  originality: 'Original',
  brand_coherence: 'Brand',
  completeness: 'Complete',
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-emerald-500'
  if (score >= 4) return 'text-amber-400'
  return 'text-destructive'
}

function QualityEvalScorecard({ eval: ev }: { eval: QualityEvalPayload }) {
  const overall = ev.qualityScore ?? 0
  const dims = ev.dimensionScores ?? {}
  const rubric = ev.dynamicRubric ?? []
  const strengths = ev.strengths ?? []
  const weaknesses = ev.weaknesses ?? []
  const claims = ev.claimsVerification ?? []

  return (
    <div className="rounded-spacing-2 space-y-spacing-2 mt-spacing-2 p-spacing-3 border-border bg-surface-subtle border">
      <div className="gap-spacing-3 flex items-center">
        <div className={`text-2xl font-bold leading-none ${scoreColor(overall)}`}>
          {overall.toFixed(1)}
        </div>
        <div className="min-w-0">
          <p className="typo-caption text-foreground dark:text-primary font-medium uppercase">
            Quality evaluation
          </p>
          <p className="typo-caption text-muted-foreground/50">Independent eval</p>
        </div>
      </div>

      {Object.keys(dims).length > 0 && (
        <div className="space-y-spacing-1">
          {Object.entries(dims).map(([key, val]) => (
            <div key={key} className="gap-spacing-2 flex items-center">
              <span className="body-4 text-muted-foreground w-14 shrink-0">
                {DIMENSION_LABELS[key] ?? key}
              </span>
              <div className="progress-bar-track flex-1">
                <div className="progress-bar-fill" style={{ width: `${(val / 10) * 100}%` }} />
              </div>
              <span className="body-4 text-muted-foreground w-5 text-right">{val}</span>
            </div>
          ))}
        </div>
      )}

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="gap-spacing-1 flex flex-wrap">
          {strengths.map((s, i) => (
            <span key={`s-${i}`} className="badge-glass badge-glass-green typo-caption font-medium">
              {s.length > 60 ? `${s.slice(0, 57)}...` : s}
            </span>
          ))}
          {weaknesses.map((w, i) => (
            <span
              key={`w-${i}`}
              className="badge-glass badge-glass-orange typo-caption font-medium"
            >
              {w.length > 60 ? `${w.slice(0, 57)}...` : w}
            </span>
          ))}
        </div>
      )}

      {rubric.length > 0 && (
        <details>
          <summary className="typo-caption text-muted-foreground cursor-pointer select-none">
            Rubric details ({rubric.length} criteria)
          </summary>
          <div className="space-y-spacing-1 mt-spacing-1">
            {rubric.map((r, i) => (
              <div key={i} className="body-4 text-muted-foreground">
                <span className="font-medium">{r.criterion}:</span>{' '}
                <span className={scoreColor(r.score)}>{r.score}/10</span>
                {r.evidence && (
                  <span className="text-muted-foreground/50"> — {r.evidence.slice(0, 120)}</span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {claims.length > 0 && (
        <details>
          <summary className="typo-caption text-muted-foreground cursor-pointer select-none">
            Claims verification ({claims.length})
          </summary>
          <div className="space-y-spacing-1 mt-spacing-1">
            {claims.map((c, i) => (
              <div key={i} className="gap-spacing-1 body-4 text-muted-foreground flex items-start">
                {c.verified ? (
                  <Check className="icon-xs mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <X className="icon-xs text-destructive mt-0.5 shrink-0" />
                )}
                <span>
                  {c.claim}
                  {c.evidence && (
                    <span className="text-muted-foreground/50"> — {c.evidence.slice(0, 100)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

interface LogPayloadDetailsProps {
  payload: Record<string, unknown>
  eventType: string
}

export function LogPayloadDetails({ payload, eventType }: LogPayloadDetailsProps) {
  const parts: string[] = []

  if (payload.error) parts.push(String(payload.error))
  const internalErr =
    typeof payload._internal_error === 'string' && payload._internal_error.trim()
      ? payload._internal_error.trim()
      : ''
  const showMissionTechnical = process.env.NEXT_PUBLIC_SHOW_MISSION_TECHNICAL === 'true'
  if (
    showMissionTechnical &&
    internalErr &&
    internalErr !== String(payload.error || '').trim() &&
    (eventType === 'mission.failed' || eventType.includes('failed'))
  ) {
    parts.push(`Technical: ${internalErr}`)
  }
  if (payload.feedback) parts.push(String(payload.feedback))
  if (payload.note) parts.push(String(payload.note))
  if (payload.step_title) parts.push(String(payload.step_title))
  if (payload.step_index && payload.total_steps)
    parts.push(`Step ${payload.step_index}/${payload.total_steps}`)
  if (payload.assigned_to) parts.push(`Assigned to ${String(payload.assigned_to)}`)
  if (payload.selected_worker_agent)
    parts.push(`Delegated to ${String(payload.selected_worker_agent)}`)
  if (payload.qualityScore && !payload.quality_eval)
    parts.push(`Quality: ${payload.qualityScore}/10`)
  if (typeof payload.retryCount === 'number')
    parts.push(`Attempt ${payload.retryCount}/${payload.attempts || '?'}`)

  const qualityEval =
    payload.quality_eval && typeof payload.quality_eval === 'object'
      ? (payload.quality_eval as QualityEvalPayload)
      : null

  if (parts.length === 0 && !qualityEval) return null

  const isError = !!payload.error || eventType.includes('failed') || eventType.includes('blocked')
  const content = parts.join('\n\n')
  const isNoCampaignWorkers = payload.reason === 'no_campaign_workers'
  const campaignId = typeof payload.campaign_id === 'string' ? payload.campaign_id : null

  return (
    <>
      {content && (
        <div
          className={`body-3 mt-0.5 ${isError ? 'text-destructive' : 'text-[var(--color-muted-foreground)]'} ${CHAT_MARKDOWN_CLASSNAME}`}
          dangerouslySetInnerHTML={{ __html: renderChatMarkdown(content) }}
        />
      )}
      {qualityEval && <QualityEvalScorecard eval={qualityEval} />}
      {isNoCampaignWorkers && campaignId && (
        <Link
          href={`/campaigns/${campaignId}?manageTeam=true`}
          className="button-glass-accent typo-xs mt-spacing-2 gap-spacing-1 inline-flex items-center rounded-lg px-3 py-1.5 font-medium"
        >
          <Users className="h-3.5 w-3.5" />
          Manage Campaign Team
        </Link>
      )}
    </>
  )
}
