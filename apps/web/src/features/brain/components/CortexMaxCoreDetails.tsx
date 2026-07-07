import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  BeliefEmotionalBars,
  BeliefMeter,
  PerspectiveMeter,
} from './CortexMaxDetailMeters'
import { CortexMaxDetailMetadataSection } from './CortexMaxDetailMetadataSection'
import {
  SECTION_LABELS,
  formatBeliefNotes,
  formatDateLabel,
  timelineEventLabel,
} from './cortex-max-detail-formatters'
import type { CortexItem } from './cortex-max-view-model'

export function CompanyObjectDetail({
  item,
}: {
  item: Extract<CortexItem, { kind: 'companyObject' }>
}) {
  const object = item.companyObject
  const retrievalTrigger =
    typeof object.retrieval_rule?.trigger === 'string' ? object.retrieval_rule.trigger : null
  const contextForm =
    typeof object.retrieval_rule?.context_form === 'string'
      ? object.retrieval_rule.context_form
      : null
  return (
    <div className="space-y-spacing-4">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            {object.object_type.replace(/_/g, ' ')}
          </p>
          <h3 className="body-1 text-foreground font-semibold">{object.title}</h3>
          <p className="body-3 text-muted-foreground mt-spacing-2 whitespace-pre-wrap leading-relaxed">
            {object.truth}
          </p>
        </div>
        <BeliefMeter
          status={object.status}
          strength={object.confidence}
          memoryCount={object.source_signal_ids.length}
        />
      </div>

      {(retrievalTrigger || contextForm) && (
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
            Retrieval rule
          </p>
          {retrievalTrigger ? (
            <p className="body-3 text-muted-foreground">
              <span className="text-foreground font-medium">When:</span> {retrievalTrigger}
            </p>
          ) : null}
          {contextForm ? (
            <p className="body-3 text-muted-foreground mt-spacing-2">
              <span className="text-foreground font-medium">Context:</span> {contextForm}
            </p>
          ) : null}
        </div>
      )}

      <CortexMaxDetailMetadataSection
        version={1}
        updatedAt={object.updated_at}
        sourceCount={object.source_signal_ids.length}
      />
    </div>
  )
}

export function NarrativePageDetail({ item }: { item: Extract<CortexItem, { kind: 'page' }> }) {
  const page = item.page
  return (
    <div className="space-y-spacing-4">
      <div>
        <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
          {SECTION_LABELS[item.section]}
        </p>
        <h3 className="body-1 text-foreground font-semibold">{page.title}</h3>
        {page.summary ? (
          <p className="body-3 text-muted-foreground mt-1">{page.summary}</p>
        ) : null}
      </div>
      {page.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {page.tags.map((tag) => (
            <span key={tag} className="badge-glass badge-glass-purple badge-glass-sm body-4">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <MarkdownRenderer className="body-3 max-w-none">{page.content_md}</MarkdownRenderer>
      <CortexMaxDetailMetadataSection
        version={page.version}
        updatedAt={page.updated_at}
        sourceCount={page.source_refs.length}
      />
    </div>
  )
}

export function BeliefDetail({ item }: { item: Extract<CortexItem, { kind: 'belief' }> }) {
  const belief = item.belief
  const beliefBody =
    belief.description && belief.description.trim().length > 0
      ? formatBeliefNotes(belief.description)
          .split(/\n{2,}/)
          .filter((b) => b.trim().length > 0)
      : []
  return (
    <div className="space-y-spacing-4">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            {item.section === 'tensions' ? 'Tension' : 'Belief'}
          </p>
          <h3 className="body-1 text-foreground font-semibold">{belief.pattern_name}</h3>
        </div>
        <BeliefMeter
          status={belief.status}
          strength={belief.strength}
          memoryCount={belief.supporting_memories?.length ?? 0}
        />
      </div>
      {beliefBody.length > 0 ? (
        <div className="space-y-spacing-3">
          {beliefBody.map((block, i) => (
            <p key={i} className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {block.trim()}
            </p>
          ))}
        </div>
      ) : null}
      {belief.emotional_signature ? (
        <BeliefEmotionalBars signature={belief.emotional_signature} />
      ) : null}
    </div>
  )
}

export function TimelineDetail({ item }: { item: Extract<CortexItem, { kind: 'timeline' }> }) {
  const timeline = item.timeline
  const timelineItems = timeline.items ?? []
  return (
    <div className="space-y-spacing-4">
      <div>
        <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
          Timeline
        </p>
        <h3 className="body-1 text-foreground font-semibold">{timeline.title}</h3>
        {timeline.summary ? (
          <p className="body-3 text-muted-foreground mt-spacing-2 whitespace-pre-wrap leading-relaxed">
            {timeline.summary}
          </p>
        ) : null}
      </div>

      <div className="grid gap-spacing-2 sm:grid-cols-2">
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Happened / Valid
          </p>
          <p className="body-3 text-foreground">
            {timelineEventLabel({
              occurred_at: timeline.evidence_started_at,
              occurred_until: timeline.evidence_ended_at,
              valid_from: timeline.valid_from,
              valid_until: timeline.valid_until,
            })}
          </p>
        </div>
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Learned
          </p>
          <p className="body-3 text-foreground">
            {formatDateLabel(timeline.created_at) ?? 'Unknown'}
          </p>
        </div>
      </div>

      {timelineItems.length > 0 ? (
        <div className="space-y-spacing-2">
          <p className="typo-caption text-muted-foreground uppercase tracking-wider">
            Milestones
          </p>
          <div className="space-y-spacing-2">
            {timelineItems.map((timelineItem) => (
              <div
                key={timelineItem.id}
                className="p-spacing-3 rounded-xl border border-border bg-surface-subtle"
              >
                <div className="gap-spacing-2 flex flex-wrap items-center">
                  <span className="body-4 text-muted-foreground uppercase">
                    {timelineItem.item_type.replace(/_/g, ' ')}
                  </span>
                  <span className="body-4 text-muted-foreground">
                    Happened: {timelineEventLabel(timelineItem)}
                  </span>
                  <span className="body-4 text-muted-foreground">
                    Learned:{' '}
                    {formatDateLabel(timelineItem.asserted_at ?? timelineItem.created_at) ??
                      'Unknown'}
                  </span>
                </div>
                <h4 className="body-3 text-foreground mt-spacing-1 font-medium">
                  {timelineItem.title}
                </h4>
                {timelineItem.description ? (
                  <p className="body-3 text-muted-foreground mt-spacing-1 whitespace-pre-wrap leading-relaxed">
                    {timelineItem.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="body-3 text-muted-foreground">
          No milestones have been synthesized for this timeline yet.
        </p>
      )}
    </div>
  )
}

export function PerspectiveDetail({
  item,
}: {
  item: Extract<CortexItem, { kind: 'perspective' }>
}) {
  const perspective = item.perspective
  const perspectiveBody =
    perspective.narrative_md && perspective.narrative_md.trim().length > 0
      ? null
      : perspective.description && perspective.description.trim().length > 0
        ? formatBeliefNotes(perspective.description)
            .split(/\n{2,}/)
            .filter((b) => b.trim().length > 0)
        : []
  return (
    <div className="space-y-spacing-4">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Perspective
          </p>
          <h3 className="body-1 text-foreground font-semibold">{perspective.name}</h3>
        </div>
        <PerspectiveMeter
          status={perspective.status}
          strength={perspective.strength}
          beliefCount={perspective.beliefs?.length ?? 0}
        />
      </div>
      {perspectiveBody && perspectiveBody.length > 0 ? (
        <div className="space-y-spacing-3">
          {perspectiveBody.map((block, i) => (
            <p key={i} className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {block.trim()}
            </p>
          ))}
        </div>
      ) : null}
      {perspective.influence_areas?.length ? (
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
            Influence Areas
          </p>
          <div className="flex flex-wrap gap-1">
            {perspective.influence_areas.map((area: string) => (
              <span key={area} className="badge-glass badge-glass-cyan badge-glass-sm body-4">
                {area.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {perspective.blind_spots ? (
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Blind Spots
          </p>
          <p className="body-3 text-muted-foreground whitespace-pre-wrap">
            {perspective.blind_spots}
          </p>
        </div>
      ) : null}
      {perspective.narrative_md ? (
        <MarkdownRenderer className="body-3 max-w-none">
          {perspective.narrative_md}
        </MarkdownRenderer>
      ) : null}
    </div>
  )
}
