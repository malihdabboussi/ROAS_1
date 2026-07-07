import { Link2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  formatDateLabel,
  formatPercent,
  shortId,
  statusBadgeClass,
  titleCaseLabel,
} from './cortex-max-detail-formatters'
import type { CortexItem } from './cortex-max-view-model'

export function CustomerUnitDetail({
  item,
}: {
  item: Extract<CortexItem, { kind: 'customerUnit' }>
}) {
  const unit = item.customerUnit
  const sourceIdentities = item.sourceIdentities
  const displayName = unit.display_name ?? unit.entity_key
  return (
    <div className="space-y-spacing-4">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Customer / Account
          </p>
          <h3 className="body-1 text-foreground font-semibold">{displayName}</h3>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            {titleCaseLabel(unit.entity_type)} unit
          </p>
        </div>
        <span className={cn('badge-glass typo-caption font-medium', statusBadgeClass(unit.status))}>
          {titleCaseLabel(unit.status)}
        </span>
      </div>

      <div className="grid gap-spacing-2 sm:grid-cols-3">
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Memories
          </p>
          <p className="body-2 text-foreground font-semibold">{unit.memory_count}</p>
        </div>
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Confidence
          </p>
          <p className="body-2 text-foreground font-semibold">{formatPercent(unit.confidence)}</p>
        </div>
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Last seen
          </p>
          <p className="body-2 text-foreground font-semibold">
            {formatDateLabel(unit.last_seen_at ?? unit.last_memory_at) ?? 'Unknown'}
          </p>
        </div>
      </div>

      {unit.primary_contact_id ? (
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Linked contact
          </p>
          <p className="body-3 text-muted-foreground font-mono">
            {shortId(unit.primary_contact_id)}
          </p>
        </div>
      ) : null}

      {sourceIdentities.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <div className="px-spacing-3 py-spacing-2 border-b border-border">
            <p className="typo-caption text-muted-foreground uppercase tracking-wider">
              Source identities ({sourceIdentities.length})
            </p>
          </div>
          <div className="space-y-spacing-2 px-spacing-3 py-spacing-3">
            {sourceIdentities.map((sourceIdentity) => (
              <div key={sourceIdentity.id} className="gap-spacing-2 flex items-start">
                <Link2 className="icon-sm text-muted-foreground mt-spacing-0-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="body-3 text-foreground truncate">
                    {sourceIdentity.source_label ??
                      `${titleCaseLabel(sourceIdentity.source_type)} ${shortId(sourceIdentity.source_id)}`}
                  </p>
                  <p className="body-4 text-muted-foreground">
                    {titleCaseLabel(sourceIdentity.identity_kind)} -{' '}
                    {formatDateLabel(sourceIdentity.last_seen_at) ?? 'Unknown'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function UnlinkedSignalDetail({
  item,
}: {
  item: Extract<CortexItem, { kind: 'unlinkedSignal' }>
}) {
  const signal = item.unlinkedSignal
  const sourceIdentity = item.sourceIdentity
  const title =
    signal.source_title ?? signal.customer_unit_name ?? signal.source_id ?? signal.customer_unit_key
  return (
    <div className="space-y-spacing-4">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Unlinked Signal
          </p>
          <h3 className="body-1 text-foreground font-semibold">{title}</h3>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            {titleCaseLabel(signal.source_type)} -{' '}
            {formatDateLabel(signal.created_at) ?? 'Unknown'}
          </p>
        </div>
        <span
          className={cn(
            'badge-glass typo-caption font-medium',
            statusBadgeClass(signal.customer_resolution_status),
          )}
        >
          {titleCaseLabel(signal.customer_resolution_status)}
        </span>
      </div>

      <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
        <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
          Memory
        </p>
        <p className="body-3 text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {signal.content}
        </p>
      </div>

      <div className="grid gap-spacing-2 sm:grid-cols-2">
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Source
          </p>
          <p className="body-3 text-foreground">{titleCaseLabel(signal.source_type)}</p>
          {signal.source_id ? (
            <p className="body-4 text-muted-foreground font-mono">{shortId(signal.source_id)}</p>
          ) : null}
        </div>
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Identity
          </p>
          <p className="body-3 text-foreground">
            {titleCaseLabel(sourceIdentity?.identity_kind ?? signal.identity_kind)}
          </p>
          <p className="body-4 text-muted-foreground">
            {sourceIdentity?.source_label ?? signal.customer_unit_key}
          </p>
        </div>
      </div>
    </div>
  )
}
