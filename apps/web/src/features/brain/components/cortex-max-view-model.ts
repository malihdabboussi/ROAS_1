import type {
  BeliefPattern,
  BrainTimeline,
  CompanyCortexObject,
  CustomerAvatar,
  CustomerBrainView,
  NarrativePage,
  Perspective,
} from '../types'
import { companyObjectSection } from './cortex-max-section-model'
import type { CortexMaxScopeType, CortexSection } from './cortex-max-section-model'

export {
  getCortexSectionLabels,
  getCortexSectionOrder,
  type CortexMaxBrainViewLayout,
  type CortexMaxScopeType,
  type CortexSection,
  type CortexSectionLabels,
} from './cortex-max-section-model'
export { filterCortexItems } from './cortex-max-search'

export const EMPTY_TIMELINES: BrainTimeline[] = []
export const EMPTY_BELIEFS: BeliefPattern[] = []
export const EMPTY_PERSPECTIVES: Perspective[] = []
export const EMPTY_CUSTOMER_AVATARS: CustomerAvatar[] = []
export const EMPTY_COMPANY_OBJECTS: CompanyCortexObject[] = []

export type CortexItem =
  | { kind: 'page'; section: CortexSection; id: string; title: string; page: NarrativePage }
  | {
      kind: 'companyObject'
      section: CortexSection
      id: string
      title: string
      companyObject: CompanyCortexObject
    }
  | { kind: 'belief'; section: CortexSection; id: string; title: string; belief: BeliefPattern }
  | {
      kind: 'perspective'
      section: CortexSection
      id: string
      title: string
      perspective: Perspective
    }
  | {
      kind: 'avatar'
      section: CortexSection
      id: string
      title: string
      avatar: CustomerAvatar
      customerView: CustomerBrainView | null
    }
  | {
      kind: 'customerUnit'
      section: CortexSection
      id: string
      title: string
      customerUnit: CustomerBrainView['units'][number]
      sourceIdentities: CustomerBrainView['source_identities']
    }
  | {
      kind: 'unlinkedSignal'
      section: CortexSection
      id: string
      title: string
      unlinkedSignal: CustomerBrainView['unlinked_memories'][number]
      sourceIdentity: CustomerBrainView['source_identities'][number] | null
    }
  | {
      kind: 'timeline'
      section: CortexSection
      id: string
      title: string
      timeline: BrainTimeline
    }

export function buildCortexItems({
  pages,
  timelines,
  beliefs,
  perspectives,
  customerAvatars,
  customerView,
  companyObjects,
  scopeType,
}: {
  pages: NarrativePage[]
  timelines: BrainTimeline[]
  beliefs: BeliefPattern[]
  perspectives: Perspective[]
  customerAvatars: CustomerAvatar[]
  customerView: CustomerBrainView | null
  companyObjects: CompanyCortexObject[]
  scopeType: CortexMaxScopeType
}): CortexItem[] {
  const items: CortexItem[] = []
  const isCustomerScope = scopeType === 'customer'
  for (const avatar of customerAvatars) {
    items.push({
      kind: 'avatar',
      section: 'avatars',
      id: `avatar:${avatar.id}`,
      title: avatar.name,
      avatar,
      customerView,
    })
  }

  const sourceIdentityById = new Map(
    (customerView?.source_identities ?? []).map((sourceIdentity) => [
      sourceIdentity.id,
      sourceIdentity,
    ]),
  )
  for (const customerUnit of customerView?.units ?? []) {
    items.push({
      kind: 'customerUnit',
      section: 'customers',
      id: `customer-unit:${customerUnit.id}`,
      title: customerUnit.display_name ?? customerUnit.entity_key,
      customerUnit,
      sourceIdentities: (customerView?.source_identities ?? []).filter(
        (sourceIdentity) => sourceIdentity.customer_entity_id === customerUnit.id,
      ),
    })
  }
  for (const signal of customerView?.unlinked_memories ?? []) {
    items.push({
      kind: 'unlinkedSignal',
      section: 'unlinkedSignals',
      id: `unlinked-signal:${signal.memory_id}`,
      title:
        signal.source_title ??
        signal.customer_unit_name ??
        signal.source_id ??
        signal.customer_unit_key,
      unlinkedSignal: signal,
      sourceIdentity: signal.customer_source_identity_id
        ? (sourceIdentityById.get(signal.customer_source_identity_id) ?? null)
        : null,
    })
  }
  for (const timeline of timelines) {
    items.push({
      kind: 'timeline',
      section: isCustomerScope ? 'collective' : 'timelines',
      id: `timeline:${timeline.id}`,
      title: timeline.title,
      timeline,
    })
  }
  for (const page of pages) {
    const section: CortexSection = isCustomerScope
      ? 'collective'
      : page.page_type === 'capsule'
        ? 'identity'
        : page.page_type === 'synthesis'
          ? 'patterns'
          : page.page_type
    items.push({ kind: 'page', section, id: `page:${page.id}`, title: page.title, page })
  }
  for (const object of companyObjects) {
    items.push({
      kind: 'companyObject',
      section: companyObjectSection(object.object_type),
      id: `company-object:${object.id}`,
      title: object.title,
      companyObject: object,
    })
  }
  for (const perspective of perspectives) {
    items.push({
      kind: 'perspective',
      section: isCustomerScope ? 'collective' : 'perspectives',
      id: `perspective:${perspective.id}`,
      title: perspective.name,
      perspective,
    })
  }
  for (const belief of beliefs) {
    items.push({
      kind: 'belief',
      section: isCustomerScope
        ? 'collective'
        : belief.status === 'challenged'
          ? 'tensions'
          : 'beliefs',
      id: `belief:${belief.id}`,
      title: belief.pattern_name,
      belief,
    })
  }
  return items
}

export function groupCortexItems(items: CortexItem[]): Record<CortexSection, CortexItem[]> {
  return items.reduce<Record<CortexSection, CortexItem[]>>(
    (acc, item) => {
      const key = item.section
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {} as Record<CortexSection, CortexItem[]>,
  )
}
