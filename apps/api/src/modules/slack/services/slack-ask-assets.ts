/**
 * `[Assets]` block — the direct, shareable links for everything an ask carries
 * (re-hosted Slack files, Drive/Docs/Figma/Loom URLs). Injected into the Pixel
 * prompt so a Service Request / task carries the asset itself, not only the
 * membership-gated Slack thread (plan §11.10).
 */
import type { SlackFileAttachment, SlackMessageAttachment } from '../types/slack.types'

export const ASSETS_HEADER = '[Assets]'

export type SlackAskAsset = {
  name: string
  url: string
  kind: string
  origin: 'slack_file' | 'link'
}

export type ResolvedSlackDocument = {
  filename: string
  type: 'text' | 'image' | 'video'
  fileUrl: string
  mimeType?: string
}

const URL_PATTERN = /https?:\/\/[^\s<>|"'()\]]+/gi

const LINK_KINDS: Array<{ pattern: RegExp; kind: string }> = [
  { pattern: /docs\.google\.com\/document/i, kind: 'google_doc' },
  { pattern: /docs\.google\.com\/spreadsheets/i, kind: 'google_sheet' },
  { pattern: /docs\.google\.com\/presentation/i, kind: 'google_slides' },
  { pattern: /docs\.google\.com\/forms/i, kind: 'google_form' },
  { pattern: /drive\.google\.com/i, kind: 'google_drive' },
  { pattern: /figma\.com/i, kind: 'figma' },
  { pattern: /loom\.com/i, kind: 'loom' },
  { pattern: /notion\.(so|site)/i, kind: 'notion' },
  { pattern: /canva\.com/i, kind: 'canva' },
  { pattern: /dropbox\.com/i, kind: 'dropbox' },
  { pattern: /(youtube\.com|youtu\.be)/i, kind: 'youtube' },
  { pattern: /vimeo\.com/i, kind: 'vimeo' },
  { pattern: /clickup\.com/i, kind: 'clickup' },
]

/** Slack permalinks and Slack-hosted file URLs are provenance, never assets. */
function isSlackInternalUrl(url: string): boolean {
  return /(^https?:\/\/[^/]*slack\.com\/)|(files\.slack\.com)|(slack-files\.com)/i.test(url)
}

export function classifyAssetLink(url: string): string {
  return LINK_KINDS.find((entry) => entry.pattern.test(url))?.kind ?? 'link'
}

function fileKind(document: ResolvedSlackDocument): string {
  const mime = (document.mimeType ?? '').toLowerCase()
  if (mime.includes('pdf')) return 'pdf'
  if (document.type === 'image') return 'image'
  if (document.type === 'video') return 'video'
  const extension = document.filename.split('.').pop()?.toLowerCase()
  return extension && extension.length <= 5 ? extension : 'file'
}

function cleanUrl(raw: string): string {
  return raw.replace(/[.,;:!?]+$/, '')
}

/** Every http(s) URL in free text that is not Slack-internal, deduped, in order. */
export function extractAssetLinks(texts: Array<string | null | undefined>): SlackAskAsset[] {
  const seen = new Set<string>()
  const assets: SlackAskAsset[] = []
  for (const text of texts) {
    if (!text) continue
    for (const match of text.matchAll(URL_PATTERN)) {
      const url = cleanUrl(match[0])
      if (!url || seen.has(url) || isSlackInternalUrl(url)) continue
      seen.add(url)
      const kind = classifyAssetLink(url)
      assets.push({
        name: kind === 'link' ? url : kind.replace(/_/g, ' '),
        url,
        kind,
        origin: 'link',
      })
    }
  }
  return assets
}

/** Files attached to the message itself plus files carried inside forwarded unfurls. */
export function collectInboundSlackFiles(input: {
  files?: SlackFileAttachment[]
  attachments?: SlackMessageAttachment[]
}): SlackFileAttachment[] {
  const seen = new Set<string>()
  const files: SlackFileAttachment[] = []
  const push = (file: SlackFileAttachment | undefined) => {
    if (!file?.id || seen.has(file.id)) return
    seen.add(file.id)
    files.push(file)
  }
  for (const file of input.files ?? []) push(file)
  for (const attachment of input.attachments ?? []) {
    for (const file of attachment.files ?? []) push(file)
  }
  return files
}

export function buildSlackAskAssets(input: {
  documents: ResolvedSlackDocument[]
  texts: Array<string | null | undefined>
}): SlackAskAsset[] {
  const fromFiles: SlackAskAsset[] = input.documents.map((document) => ({
    name: document.filename,
    url: document.fileUrl,
    kind: fileKind(document),
    origin: 'slack_file',
  }))
  const fileUrls = new Set(fromFiles.map((asset) => asset.url))
  const fromLinks = extractAssetLinks(input.texts).filter((asset) => !fileUrls.has(asset.url))
  return [...fromFiles, ...fromLinks]
}

export function formatSlackAskAssetsBlock(
  assets: SlackAskAsset[],
  options: { sourcePermalink?: string | null } = {},
): string {
  if (assets.length === 0) return ''
  const lines = [ASSETS_HEADER]
  for (const asset of assets) {
    const note =
      asset.origin === 'slack_file'
        ? 're-hosted copy of the Slack file — share this URL, never the Slack file link'
        : `direct ${asset.kind.replace(/_/g, ' ')} link`
    lines.push(`- ${asset.name} — ${asset.url} (${asset.kind}; ${note})`)
  }
  if (options.sourcePermalink) {
    lines.push(`Source thread (provenance only): ${options.sourcePermalink}`)
  }
  lines.push(
    'Rule: when you create a Service Request or task for this ask, pass every asset above as `source_context.assets` = [{ name, url, kind }] and list them under an "Assets" heading in the description so the assignee can open them directly. Slack thread/file links are gated by workspace membership — keep them only as "Source thread" provenance, never as the only link. If a Drive link may not be shared with the assignee, say so in the request.',
  )
  return lines.join('\n')
}
