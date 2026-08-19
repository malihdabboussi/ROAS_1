/**
 * Direct asset links on Service Requests (plan §11.10).
 *
 * The draft description is the one field that provably reaches the finalized
 * task and the ClickUp body, so every asset (re-hosted Slack file, Drive/Docs
 * link) is also written into it under an "Assets" heading; the Slack thread
 * permalink stays under "Source thread" as provenance only.
 */
export type WorkRequestAsset = { name: string; url: string; kind?: string }

const ASSETS_HEADING = 'Assets'
const SOURCE_THREAD_HEADING = 'Source thread'
const MAX_DESCRIPTION_ASSETS = 25

export function formatWorkRequestAssetLine(asset: WorkRequestAsset): string {
  const kind = asset.kind ? ` (${asset.kind})` : ''
  return `- ${asset.name}${kind}: ${asset.url}`
}

/**
 * Append the assets (and provenance link) to the description unless the
 * description already lists that URL. Idempotent: running twice adds nothing.
 */
export function appendAssetsToDescription(
  description: string | null | undefined,
  assets: WorkRequestAsset[] | null | undefined,
  options: { sourceUrl?: string | null } = {},
): string | null {
  const base = (description ?? '').trimEnd()
  const missing = (assets ?? [])
    .slice(0, MAX_DESCRIPTION_ASSETS)
    .filter((asset) => asset?.url && !base.includes(asset.url))
  const sourceUrl = options.sourceUrl?.trim() || null
  const needsSource = Boolean(sourceUrl && !base.includes(sourceUrl))
  if (missing.length === 0 && !needsSource) return description ?? null

  const sections: string[] = []
  if (missing.length > 0) {
    sections.push([`${ASSETS_HEADING}:`, ...missing.map(formatWorkRequestAssetLine)].join('\n'))
  }
  if (needsSource) sections.push(`${SOURCE_THREAD_HEADING}: ${sourceUrl}`)
  return [base, ...sections].filter(Boolean).join('\n\n')
}
