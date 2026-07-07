import type { CompanyCortexObject } from '../types'

export const GROUP_ORDER = [
  'collective',
  'avatars',
  'customers',
  'unlinkedSignals',
  'timelines',
  'identity',
  'perspectives',
  'beliefs',
  'tensions',
  'patterns',
  'topic',
  'entity',
] as const

export type CortexSection = (typeof GROUP_ORDER)[number]
export type CortexSectionLabels = Record<CortexSection, string>
export type CortexMaxBrainViewLayout = 'default' | 'team2'
export type CortexMaxScopeType = 'user' | 'customer' | 'agent' | 'campaign' | 'company' | 'shared'

const DEFAULT_GROUP_ORDER: readonly CortexSection[] = [
  'avatars',
  'timelines',
  'identity',
  'perspectives',
  'beliefs',
  'tensions',
  'patterns',
  'topic',
  'entity',
]

const CUSTOMER_GROUP_ORDER: readonly CortexSection[] = [
  'collective',
  'avatars',
  'customers',
  'unlinkedSignals',
]

const USER_SECTION_LABELS: CortexSectionLabels = {
  collective: 'Collective',
  avatars: 'Avatars',
  customers: 'Customers',
  unlinkedSignals: 'Unlinked Signals',
  timelines: 'Timelines',
  identity: 'Identity',
  perspectives: 'Perspectives',
  beliefs: 'Beliefs',
  tensions: 'Tensions',
  patterns: 'Patterns',
  topic: 'Topics',
  entity: 'People & Places',
}

const CUSTOMER_SECTION_LABELS: CortexSectionLabels = {
  collective: 'Collective',
  avatars: 'Avatars',
  customers: 'Customers / Accounts',
  unlinkedSignals: 'Unlinked Signals',
  timelines: 'Journeys',
  identity: 'Identity',
  perspectives: 'Customer Perspectives',
  beliefs: 'Customer Beliefs',
  tensions: 'Avatar Tensions',
  patterns: 'Pain Patterns',
  topic: 'Conversation Themes',
  entity: 'Customers',
}

const COMPANY_SECTION_LABELS: CortexSectionLabels = {
  collective: 'Collective',
  avatars: 'Signals',
  customers: 'Customers',
  unlinkedSignals: 'Unlinked Signals',
  timelines: 'Timelines',
  identity: 'Company Capsule',
  perspectives: 'Company Perspectives',
  beliefs: 'Operating Beliefs',
  tensions: 'Company Tensions',
  patterns: 'Operating Patterns',
  topic: 'Standards & Protocols',
  entity: 'Teams & Systems',
}

export function companyObjectSection(type: CompanyCortexObject['object_type']): CortexSection {
  if (type === 'belief') return 'beliefs'
  if (type === 'perspective') return 'perspectives'
  if (type === 'tension') return 'tensions'
  if (type === 'standard' || type === 'protocol' || type === 'retrieval_rule') return 'topic'
  if (type === 'move' || type === 'anti_pattern') return 'patterns'
  if (type === 'decision') return 'entity'
  return 'patterns'
}

export function getCortexSectionLabels(scopeType: CortexMaxScopeType): CortexSectionLabels {
  if (scopeType === 'customer') return CUSTOMER_SECTION_LABELS
  if (scopeType === 'company') return COMPANY_SECTION_LABELS
  return USER_SECTION_LABELS
}

export function getCortexSectionOrder(scopeType: CortexMaxScopeType): readonly CortexSection[] {
  return scopeType === 'customer' ? CUSTOMER_GROUP_ORDER : DEFAULT_GROUP_ORDER
}
