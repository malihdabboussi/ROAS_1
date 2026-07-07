'use client'

import { useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { cn } from '@/lib/utils/cn'
import type { CustomerAvatar, CustomerBrainView } from '../types'
import { BeliefMeter } from './CortexMaxDetailMeters'
import { formatPercent, shortId, titleCaseLabel } from './cortex-max-detail-formatters'

const ROBBINS_NEEDS_LABELS: Record<string, string> = {
  certainty: 'Certainty',
  variety: 'Variety',
  significance: 'Significance',
  connection: 'Connection',
  growth: 'Growth',
  contribution: 'Contribution',
}

const ROBBINS_NEEDS_ORDER = [
  'certainty',
  'variety',
  'significance',
  'connection',
  'growth',
  'contribution',
] as const

export function AvatarDetail({
  avatar,
  customerView,
}: {
  avatar: CustomerAvatar
  customerView: CustomerBrainView | null
}) {
  const memberCount =
    avatar.member_customer_unit_ids?.length ?? avatar.member_contact_ids?.length ?? 0
  const strength = typeof avatar.strength === 'number' ? avatar.strength : 0
  const status = avatar.status ?? 'emerging'

  const discriminatorEntries = avatar.discriminator_profile
    ? Object.entries(avatar.discriminator_profile)
        .filter(([, v]) => typeof v === 'number')
        .sort(([a], [b]) => a.localeCompare(b))
    : []

  const needsEntries = ROBBINS_NEEDS_ORDER.filter(
    (k) => avatar.needs_profile?.[k] !== undefined,
  ).map((k) => ({
    key: k,
    label: ROBBINS_NEEDS_LABELS[k] ?? k,
    score: Math.max(0, Math.min(10, avatar.needs_profile?.[k]?.score ?? 0)),
    rank: avatar.needs_profile?.[k]?.rank ?? null,
  }))

  const contrastEntries = avatar.contrast_profile
    ? Object.entries(avatar.contrast_profile).filter(([, v]) => typeof v === 'string' && v.trim())
    : []

  return (
    <div className="space-y-spacing-4">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Avatar
          </p>
          <h3 className="body-1 text-foreground font-semibold">{avatar.name}</h3>
          {avatar.summary ? (
            <p className="body-3 text-muted-foreground mt-1">{avatar.summary}</p>
          ) : null}
        </div>
        <BeliefMeter status={status} strength={strength} memoryCount={memberCount} />
      </div>

      {avatar.narrative_md ? (
        <MarkdownRenderer className="body-3 max-w-none">{avatar.narrative_md}</MarkdownRenderer>
      ) : null}

      {discriminatorEntries.length > 0 ? (
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
            Discriminator profile
          </p>
          <div className="flex flex-wrap gap-1.5">
            {discriminatorEntries.map(([axis, score]) => (
              <span
                key={axis}
                className="badge-glass badge-glass-purple badge-glass-sm body-4 capitalize"
                title={`${axis.replace(/_/g, ' ')}: ${score}/10`}
              >
                {axis.replace(/_/g, ' ')} <span className="text-muted-foreground">{score}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {needsEntries.length > 0 ? (
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
            Six Human Needs (Robbins)
          </p>
          <div className="space-y-1.5">
            {needsEntries.map((n) => {
              const pct = (n.score / 10) * 100
              const isPrimary = n.rank === 'primary'
              const isSecondary = n.rank === 'secondary'
              return (
                <div key={n.key} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'body-4 w-32 shrink-0',
                      isPrimary
                        ? 'text-foreground font-medium'
                        : isSecondary
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                    )}
                  >
                    {n.label}
                    {isPrimary ? ' ★' : isSecondary ? ' ☆' : ''}
                  </span>
                  <div className="bg-secondary relative h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full',
                        isPrimary
                          ? 'bg-primary'
                          : isSecondary
                            ? 'bg-muted-foreground'
                            : 'bg-border',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="body-4 text-muted-foreground w-8 shrink-0 text-right">
                    {n.score}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {avatar.dominant_pain_points && avatar.dominant_pain_points.length > 0 ? (
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
            Pain points
          </p>
          <div className="flex flex-wrap gap-1">
            {avatar.dominant_pain_points.map((pain) => (
              <span key={pain} className="badge-glass badge-glass-red badge-glass-sm body-4">
                {pain}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {avatar.blind_spots ? (
        <div className="p-spacing-3 rounded-xl border border-border bg-surface-subtle">
          <p className="typo-caption text-muted-foreground mb-spacing-1 uppercase tracking-wider">
            Blind spots
          </p>
          <p className="body-3 text-muted-foreground whitespace-pre-wrap">{avatar.blind_spots}</p>
        </div>
      ) : null}

      {contrastEntries.length > 0 ? (
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
            Contrast vs other avatars
          </p>
          <div className="space-y-1.5">
            {contrastEntries.map(([peerKey, line]) => (
              <p key={peerKey} className="body-3 text-muted-foreground leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {avatar.discriminator_questions && avatar.discriminator_questions.length > 0 ? (
        <div>
          <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wider">
            Discriminator questions
          </p>
          <ul className="space-y-1">
            {avatar.discriminator_questions.map((q, i) => (
              <li key={i} className="body-3 text-muted-foreground">
                — {q}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AvatarMembersSection avatar={avatar} customerView={customerView} />
    </div>
  )
}

function AvatarMembersSection({
  avatar,
  customerView,
}: {
  avatar: CustomerAvatar
  customerView: CustomerBrainView | null
}) {
  const [open, setOpen] = useState(false)
  const rows = resolvedAvatarMembers(avatar, customerView)
  if (rows.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-surface-subtle">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-spacing-3 py-spacing-2 group flex w-full items-center justify-between text-left transition-colors hover:bg-hover-subtle"
        aria-expanded={open}
      >
        <span className="typo-caption text-muted-foreground uppercase tracking-wider">
          Members ({rows.length})
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-3.5 w-3.5 transition-transform',
            open ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>
      {open ? (
        <div className="px-spacing-3 py-spacing-3 border-t border-border">
          <ul className="space-y-spacing-2">
            {rows.map((row) => (
              <li key={row.key} className="gap-spacing-2 flex items-start justify-between">
                <div className="gap-spacing-2 flex min-w-0 items-start">
                  <Users className="icon-sm text-muted-foreground mt-spacing-0-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="body-3 text-foreground truncate">{row.label}</p>
                    <p className="body-4 text-muted-foreground">{row.detail}</p>
                  </div>
                </div>
                <span className="badge-glass badge-glass-muted typo-caption shrink-0 font-medium">
                  {titleCaseLabel(row.kind)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function resolvedAvatarMembers(
  avatar: CustomerAvatar,
  customerView: CustomerBrainView | null,
): Array<{ key: string; label: string; detail: string; kind: string }> {
  const unitsById = new Map((customerView?.units ?? []).map((unit) => [unit.id, unit]))
  const sourceIdentityById = new Map(
    (customerView?.source_identities ?? []).map((sourceIdentity) => [
      sourceIdentity.id,
      sourceIdentity,
    ]),
  )
  const sourceIdentitiesByUnitId = new Map<string, CustomerBrainView['source_identities']>()
  for (const sourceIdentity of customerView?.source_identities ?? []) {
    if (!sourceIdentity.customer_entity_id) continue
    const existing = sourceIdentitiesByUnitId.get(sourceIdentity.customer_entity_id) ?? []
    existing.push(sourceIdentity)
    sourceIdentitiesByUnitId.set(sourceIdentity.customer_entity_id, existing)
  }
  const seenContacts = new Set<string>()
  const rows: Array<{ key: string; label: string; detail: string; kind: string }> = []

  for (const unitId of avatar.member_customer_unit_ids ?? []) {
    const unit = unitsById.get(unitId)
    const sourceIdentity = sourceIdentityById.get(unitId)
    const unitSources = sourceIdentitiesByUnitId.get(unitId) ?? []
    const contactId = unit?.primary_contact_id ?? sourceIdentity?.contact_id ?? null
    if (contactId) seenContacts.add(contactId)
    const strength =
      avatar.member_strength?.[unitId] ?? (contactId ? avatar.member_strength?.[contactId] : null)
    rows.push({
      key: unitId,
      label:
        unit?.display_name ??
        sourceIdentity?.source_label ??
        (sourceIdentity
          ? `${titleCaseLabel(sourceIdentity.source_type)} ${shortId(sourceIdentity.source_id)}`
          : `Customer unit ${shortId(unitId)}`),
      detail: [
        titleCaseLabel(unit?.entity_type ?? (sourceIdentity ? 'source_identity' : 'customer_unit')),
        unitSources.length > 0 ? `${unitSources.length} source identities` : null,
        typeof strength === 'number' ? `strength ${formatPercent(strength)}` : null,
      ]
        .filter(Boolean)
        .join(' - '),
      kind: unit?.entity_type ?? (sourceIdentity ? 'source_identity' : 'customer_unit'),
    })
  }

  for (const contactId of avatar.member_contact_ids ?? []) {
    if (seenContacts.has(contactId)) continue
    const contactStrength = avatar.member_strength?.[contactId]
    rows.push({
      key: contactId,
      label: `Contact ${shortId(contactId)}`,
      detail:
        typeof contactStrength === 'number'
          ? `strength ${formatPercent(contactStrength)}`
          : 'Known contact projection',
      kind: 'contact',
    })
  }

  return rows
}
