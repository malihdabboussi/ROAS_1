import type { MissionDeliverable, MissionSubtask } from '@/lib/missions'

export type AdsResearchProductionRoute = 'recording' | 'design'

export interface AdsResearchConcept {
  id: string
  title: string
  route: AdsResearchProductionRoute
}

const GENERIC_HEADINGS = new Set([
  'situation summary',
  'compliance flag',
  'current ads analysis',
  'market and competitive research',
  'recommended ads and draft copy',
  'draft video ad scripts',
  'what to do next',
  'next steps',
  'sources',
])

function plainText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function stableConceptId(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${index + 1}-${slug || 'concept'}`
}

function headingCandidates(content: string): string[] {
  const html = [...content.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi)].map((match) =>
    plainText(match[1] ?? ''),
  )
  const markdown = [...content.matchAll(/^#{2,4}\s+(.+)$/gm)].map((match) =>
    plainText(match[1] ?? ''),
  )
  return html.length > 0 ? html : markdown
}

export function extractAdsResearchConcepts(
  deliverable: MissionDeliverable | undefined,
): AdsResearchConcept[] {
  if (!deliverable?.content) return []
  const headings = headingCandidates(deliverable.content)
  const explicitlyNumbered = headings.filter((heading) =>
    /^(concept|ad|recommendation)\s*\d+/i.test(heading),
  )
  const candidates = explicitlyNumbered.length > 0 ? explicitlyNumbered : headings
  const seen = new Set<string>()
  return candidates
    .filter((heading) => {
      const normalized = heading
        .replace(/^(concept|ad|recommendation)\s*\d+\s*[:.-]\s*/i, '')
        .trim()
      const key = normalized.toLowerCase()
      if (!normalized || GENERIC_HEADINGS.has(key) || seen.has(key)) return false
      seen.add(key)
      return candidates.length <= 8
    })
    .slice(0, 12)
    .map((heading, index) => {
      const title = heading.replace(/^(concept|ad|recommendation)\s*\d+\s*[:.-]\s*/i, '').trim()
      return {
        id: stableConceptId(title, index),
        title,
        route: /\b(video|script|ugc|vsl|talking head)\b/i.test(title) ? 'recording' : 'design',
      }
    })
}

export function findAdsResearchApprovalGate(
  subtasks: MissionSubtask[],
): MissionSubtask | undefined {
  return subtasks.find((subtask) => /approve research recommendations/i.test(subtask.title))
}

export function buildAdsResearchApprovalSummary(concepts: AdsResearchConcept[]): string {
  const lines = concepts.map(
    (concept) => `- ${concept.title} (${concept.route === 'recording' ? 'recording' : 'design'})`,
  )
  return [
    'Approved concepts for production:',
    ...lines,
    '',
    'Draft video scripts approved where applicable.',
    'Create or collect the required creative, then build the approved ads in Meta as paused objects.',
  ].join('\n')
}
