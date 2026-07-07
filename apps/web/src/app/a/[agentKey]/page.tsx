import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  EmbeddedAgentContainer,
  PublicAgentContainer,
  type EmbeddedAgentBrand,
} from '@/features/public-agent'
import type { PublicAgentInfo } from '@/features/public-agent/types/public-agent.types'

const WORKER_SECRET = process.env.WORKER_SECRET ?? ''

interface PageProps {
  params: Promise<{ agentKey: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agentKey } = await params
  const headerStore = await headers()
  const name = headerStore.get('x-vibey-agent-name')
  const role = headerStore.get('x-vibey-agent-role')
  if (!name) return { title: 'Agent | Vibey' }
  return { title: `${name} — ${role || agentKey} | Vibey` }
}

export default async function PublicAgentPage({
  params,
  searchParams,
}: PageProps & { searchParams: Promise<Record<string, string | undefined>> }) {
  const { agentKey } = await params
  const headerStore = await headers()
  const query = await searchParams

  const isDev = process.env.NODE_ENV === 'development'
  /** In-app widget builder preview iframe: same query params as dev, no edge-injected headers. */
  const isBuilderPreview = query.embed === '1' && query.preview === '1'
  const useQueryContext = isDev || isBuilderPreview

  const userId = headerStore.get('x-vibey-user-id') ?? (useQueryContext ? query._uid : null) ?? null
  const secret = headerStore.get('x-vibey-worker-secret')

  const requireWorkerSecret = !isDev && !isBuilderPreview
  if (!userId || (requireWorkerSecret && (!WORKER_SECRET || secret !== WORKER_SECRET))) {
    notFound()
  }

  const agentName =
    headerStore.get('x-vibey-agent-name') ?? (useQueryContext ? query._name : null) ?? null
  const agentRole =
    headerStore.get('x-vibey-agent-role') ?? (useQueryContext ? query._role : null) ?? ''
  const agentImage =
    headerStore.get('x-vibey-agent-image') ?? (useQueryContext ? query._image : null) ?? null
  const userSlug =
    headerStore.get('x-vibey-user-slug') ?? (useQueryContext ? query._slug : null) ?? null

  if (!agentName || !userSlug) {
    notFound()
  }

  const agentInfo: PublicAgentInfo = {
    agentKey,
    name: agentName,
    role: agentRole,
    imageUrl: agentImage,
    userId,
    userSlug,
  }

  const isEmbed = query.embed === '1'
  if (isEmbed) {
    const brand: EmbeddedAgentBrand = {
      title: query.title || agentName,
      subtitle: query.subtitle ?? (agentRole || null),
      greeting: query.greeting ?? null,
      accentColor: query.accent || '#7C3AED',
      imageUrl: query.avatar ?? agentImage,
      poweredByTagline: query.tagline || 'Powered by Vibey — Build your own AI workforce',
    }
    return (
      <EmbeddedAgentContainer
        agent={agentInfo}
        brand={brand}
        suppressInitialWidgetFetch={isBuilderPreview}
      />
    )
  }

  return <PublicAgentContainer agent={agentInfo} />
}
