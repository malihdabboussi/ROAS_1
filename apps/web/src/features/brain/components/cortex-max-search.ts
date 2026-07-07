import type { NarrativePage } from '../types'
import type { CortexItem } from './cortex-max-view-model'
import type { CortexMaxBrainViewLayout } from './cortex-max-section-model'

const PAGE_TYPE_LABELS: Record<string, string> = {
  capsule: 'Identity',
  topic: 'Topics',
  entity: 'People & Places',
  synthesis: 'Patterns',
}

function pageMatchesQuery(page: NarrativePage, q: string): boolean {
  if (!q) return true
  const typeLabel = PAGE_TYPE_LABELS[page.page_type] ?? page.page_type
  const blob = [page.title, page.summary ?? '', page.content_md ?? '', typeLabel, ...page.tags]
    .join(' ')
    .toLowerCase()
  return blob.includes(q)
}

function itemMatchesQuery(item: CortexItem, q: string): boolean {
  if (!q) return true
  if (item.kind === 'page') return pageMatchesQuery(item.page, q)
  if (item.kind === 'companyObject') {
    const object = item.companyObject
    return [object.title, object.truth, object.object_type, object.status, item.section]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }
  if (item.kind === 'belief') {
    const belief = item.belief
    return [
      belief.pattern_name,
      belief.description ?? '',
      belief.status,
      belief.emotional_signature?.dominant_emotion ?? '',
      item.section,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }
  if (item.kind === 'perspective') {
    const perspective = item.perspective
    return [
      perspective.name,
      perspective.description ?? '',
      perspective.status,
      perspective.blind_spots ?? '',
      ...(perspective.influence_areas ?? []),
      item.section,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }
  if (item.kind === 'timeline') {
    const timeline = item.timeline
    return [
      timeline.title,
      timeline.summary ?? '',
      timeline.timeline_type,
      timeline.target_type,
      ...(timeline.items ?? []).map((entry) => `${entry.title} ${entry.description ?? ''}`),
      item.section,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }
  if (item.kind === 'customerUnit') {
    const unit = item.customerUnit
    return [
      unit.display_name ?? '',
      unit.entity_key,
      unit.entity_type,
      unit.status,
      unit.primary_contact_id ?? '',
      item.section,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }
  if (item.kind === 'unlinkedSignal') {
    const signal = item.unlinkedSignal
    return [
      signal.customer_unit_name ?? '',
      signal.customer_unit_key,
      signal.source_title ?? '',
      signal.source_type ?? '',
      signal.source_id ?? '',
      signal.customer_resolution_status,
      item.section,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }
  const avatar = item.avatar
  return [
    avatar.name,
    avatar.summary ?? '',
    avatar.narrative_md ?? '',
    avatar.status,
    avatar.blind_spots ?? '',
    ...(avatar.dominant_pain_points ?? []),
    item.section,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

export function filterCortexItems(
  items: CortexItem[],
  layout: CortexMaxBrainViewLayout,
  query: string,
): CortexItem[] {
  if (layout !== 'team2') return items
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => itemMatchesQuery(item, q))
}
