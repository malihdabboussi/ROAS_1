'use client'

import { useEffect, useState } from 'react'
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  MessageSquare,
  Package,
  Plus,
  Rocket,
  Target,
  Users,
} from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import type { StudioGlobalSearchResult } from '@/features/studio/services/studio-search-api.service'

const ARTIFACT_BADGE_LABEL: Record<
  NonNullable<StudioGlobalSearchResult['artifactKind']>,
  string
> = {
  offer: 'Offer',
  funnel: 'Funnel',
  website: 'Website',
  sequence: 'Sequence',
  email: 'Email',
  presentation: 'Presentation',
  avatar: 'Avatar',
  ad: 'Ad',
  ad_campaign: 'Ads',
  ad_set: 'Ad set',
  social_post: 'Social',
  blog_post: 'Blog',
  page: 'Page',
}

export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timeout)
  }, [value, ms])
  return debounced
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

export function mergeSearchResults(
  current: StudioGlobalSearchResult[],
  incoming: StudioGlobalSearchResult[],
): StudioGlobalSearchResult[] {
  const merged = new Map(current.map((item) => [`${item.kind}-${item.id}`, item]))
  for (const item of incoming) merged.set(`${item.kind}-${item.id}`, item)
  return [...merged.values()]
}

export function resultBadge(result: StudioGlobalSearchResult): string {
  if (result.kind === 'artifact' && result.artifactKind) {
    return ARTIFACT_BADGE_LABEL[result.artifactKind]
  }
  if (result.kind === 'preset') return 'Preset'
  if (result.kind === 'mission') return 'Mission'
  if (result.kind === 'client') return 'Client'
  if (result.kind === 'request') return 'Request'
  const labels: Record<'task' | 'doc' | 'deliverable' | 'conversation' | 'campaign', string> = {
    task: 'Task',
    doc: 'Doc',
    deliverable: 'Deliverable',
    conversation: 'Conversation',
    campaign: 'Campaign',
  }
  return result.kind === 'artifact' ? 'Artifact' : labels[result.kind]
}

export function ResultIcon({ result }: { result: StudioGlobalSearchResult }) {
  const className = 'h-4 w-4'
  if (result.kind === 'client') return <Users className={className} />
  if (result.kind === 'request') return <BriefcaseBusiness className={className} />
  if (result.kind === 'task') return <CheckSquare className={className} />
  if (result.kind === 'doc') return <FileText className={className} />
  if (result.kind === 'deliverable' || result.kind === 'artifact') {
    return <Package className={className} />
  }
  if (result.kind === 'campaign') {
    return <LucideIcon name={result.campaignIcon ?? 'folder-kanban'} className={className} />
  }
  if (result.kind === 'mission') return <Rocket className={className} />
  if (result.kind === 'preset' && result.id === 'launches') {
    return <CalendarDays className={className} />
  }
  if (result.kind === 'preset' && result.id === 'clients') return <Users className={className} />
  if (result.kind === 'preset' && result.id === 'client-campaigns')
    return <FolderKanban className={className} />
  if (result.kind === 'preset' && result.id === 'all-tasks')
    return <CheckSquare className={className} />
  if (result.kind === 'preset' && result.id.startsWith('create-'))
    return <Plus className={className} />
  if (result.kind === 'preset') return <Target className={className} />
  return <MessageSquare className={className} />
}
