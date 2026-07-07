'use client'

import { CheckCircle2, FileText, Info, ListChecks, Target } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { AGENT_IMPROVEMENT_SUGGESTION_MESSAGES } from '@/features/home/config/agent-improvement-suggestions.config'
import {
  getSuggestionActionLabel,
  getSuggestionConfidenceLabel,
  getSuggestionEvidenceLabel,
  getSuggestionPatchPreview,
  getSuggestionSourceBadgeClass,
  getSuggestionSourceLabel,
  getSuggestionStatusBadgeClass,
  getSuggestionStatusLabel,
  getSuggestionTargetLabel,
  type SuggestionReviewItem,
} from '@/features/home/lib/suggestion-review'

interface DetailSectionProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  tooltip: string
  children: React.ReactNode
}

function DetailSection({ icon: Icon, title, tooltip, children }: DetailSectionProps) {
  return (
    <section className="border-border pt-spacing-4 border-t">
      <div className="gap-spacing-2 mb-spacing-2 flex items-center">
        <Tooltip label={tooltip} side="top" delayMs={150}>
          <Icon className="icon-sm text-muted-foreground shrink-0" />
        </Tooltip>
        <h4 className="body-3 text-foreground font-medium">{title}</h4>
      </div>
      {children}
    </section>
  )
}

function JsonEvidencePreview({ value }: { value: Array<Record<string, unknown>> }) {
  if (value.length === 0) {
    return <p className="body-3 text-muted-foreground">No evidence references attached.</p>
  }
  return (
    <pre className="border-border bg-background body-4 text-foreground rounded-spacing-2 p-spacing-3 max-h-52 overflow-auto whitespace-pre-wrap border font-mono">
      {JSON.stringify(value.slice(0, 5), null, 2)}
    </pre>
  )
}

function JaimeDetail({ item }: { item: SuggestionReviewItem & { source: 'jaime' } }) {
  const rec = item.recommendation
  const patch = getSuggestionPatchPreview(item)

  return (
    <div className="space-y-spacing-5">
      <DetailSection
        icon={Info}
        title="Why this came up"
        tooltip="Evidence Jaime used when creating this proposal"
      >
        <p className="body-3 text-foreground">{item.summary}</p>
        {rec.description && rec.description !== item.summary ? (
          <p className="body-4 text-muted-foreground mt-spacing-2">{rec.description}</p>
        ) : null}
      </DetailSection>

      {rec.recommended_actions.length > 0 ? (
        <DetailSection
          icon={ListChecks}
          title="Recommended action"
          tooltip="What Jaime is asking you to approve"
        >
          <ul className="space-y-spacing-2">
            {rec.recommended_actions.map((action) => (
              <li key={action} className="body-3 text-foreground">
                {action}
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      <DetailSection
        icon={FileText}
        title="Proposed change"
        tooltip="Preview of the file or skill change"
      >
        <pre className="border-border bg-background body-4 text-foreground rounded-spacing-2 p-spacing-3 max-h-72 overflow-auto whitespace-pre-wrap border font-mono">
          {patch ?? AGENT_IMPROVEMENT_SUGGESTION_MESSAGES.NO_PATCH}
        </pre>
      </DetailSection>

      {rec.resources.length > 0 ? (
        <DetailSection
          icon={FileText}
          title="Resources"
          tooltip="Files Jaime attached to the proposal"
        >
          <div className="space-y-spacing-3">
            {rec.resources.map((resource) => (
              <div
                key={resource.file_path}
                className="border-border pt-spacing-3 border-t first:border-t-0 first:pt-0"
              >
                <p className="body-3 text-foreground font-medium">{resource.file_path}</p>
                <p className="body-4 text-muted-foreground mt-spacing-1 line-clamp-3">
                  {resource.content}
                </p>
              </div>
            ))}
          </div>
        </DetailSection>
      ) : null}
    </div>
  )
}

function AtlasDetail({ item }: { item: SuggestionReviewItem & { source: 'atlas' } }) {
  const signal = item.signal

  return (
    <div className="space-y-spacing-5">
      <DetailSection
        icon={Info}
        title="Why this came up"
        tooltip="Reason Atlas gave for this Company Cortex signal"
      >
        <p className="body-3 text-foreground">{signal.reason ?? item.summary}</p>
        {signal.context_form ? (
          <p className="body-4 text-muted-foreground mt-spacing-2">{signal.context_form}</p>
        ) : null}
      </DetailSection>

      <DetailSection
        icon={ListChecks}
        title="Recommended action"
        tooltip="What approving this will do"
      >
        <p className="body-3 text-foreground">
          Approve this signal so Atlas can form it into Company Cortex.
        </p>
      </DetailSection>

      <DetailSection icon={FileText} title="Evidence" tooltip="Source references Atlas attached">
        <JsonEvidencePreview value={signal.evidence_refs} />
      </DetailSection>
    </div>
  )
}

export function SuggestionDetail({ item }: { item: SuggestionReviewItem }) {
  const sourceLabel = getSuggestionSourceLabel(item.source)
  const statusLabel = getSuggestionStatusLabel(item)

  return (
    <div className="px-spacing-6 py-spacing-5">
      <div className="min-w-0">
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <span
            className={`badge-glass ${getSuggestionSourceBadgeClass(item.source)} typo-caption font-medium`}
          >
            {sourceLabel}
          </span>
          <span
            className={`badge-glass ${getSuggestionStatusBadgeClass(item)} typo-caption font-medium`}
          >
            {statusLabel}
          </span>
        </div>
        <h3 className="title-h6 text-foreground mt-spacing-3">{item.title}</h3>
        <p className="body-3 text-muted-foreground mt-spacing-1">{item.summary}</p>
      </div>

      <div className="border-border my-spacing-5 gap-spacing-4 py-spacing-3 grid border-y md:grid-cols-3">
        <div className="gap-spacing-2 flex min-w-0 items-start">
          <Target className="icon-sm text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="typo-caption text-muted-foreground uppercase">Target</p>
            <p className="body-3 text-foreground mt-spacing-1 truncate">
              {getSuggestionTargetLabel(item)}
            </p>
          </div>
        </div>
        <div className="gap-spacing-2 flex min-w-0 items-start">
          <ListChecks className="icon-sm text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="typo-caption text-muted-foreground uppercase">Action</p>
            <p className="body-3 text-foreground mt-spacing-1 truncate">
              {getSuggestionActionLabel(item)}
            </p>
          </div>
        </div>
        <div className="gap-spacing-2 flex min-w-0 items-start">
          <CheckCircle2 className="icon-sm text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="typo-caption text-muted-foreground uppercase">Signal</p>
            <p className="body-3 text-foreground mt-spacing-1 truncate">
              {getSuggestionConfidenceLabel(item)} · {getSuggestionEvidenceLabel(item)}
            </p>
          </div>
        </div>
      </div>

      {item.source === 'jaime' ? <JaimeDetail item={item} /> : <AtlasDetail item={item} />}
    </div>
  )
}
