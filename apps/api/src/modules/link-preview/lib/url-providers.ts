import { ROAS_LINK_PREVIEW_INTERNAL_HOSTS } from '../../../lib/platform-defaults'
import type { LinkPreviewProvider } from '../link-preview.types'

const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com'])
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'])
const LOOM_HOSTS = new Set(['loom.com', 'www.loom.com'])
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com'])
const FIGMA_HOSTS = new Set(['figma.com', 'www.figma.com'])

const INTERNAL_HOSTS = (process.env.LINK_PREVIEW_INTERNAL_HOSTS || ROAS_LINK_PREVIEW_INTERNAL_HOSTS)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export function detectProvider(url: string): LinkPreviewProvider {
  let host = ''
  try {
    host = new URL(url).host.toLowerCase()
  } catch {
    return 'generic'
  }
  if (DRIVE_HOSTS.has(host)) return 'drive'
  if (YOUTUBE_HOSTS.has(host)) return 'youtube'
  if (LOOM_HOSTS.has(host)) return 'loom'
  if (VIMEO_HOSTS.has(host)) return 'vimeo'
  if (FIGMA_HOSTS.has(host)) return 'figma'
  if (INTERNAL_HOSTS.includes(host)) return 'internal'
  return 'generic'
}

/** Pulls the Drive file id out of any of the common URL shapes. */
export function extractDriveFileId(url: string): string | null {
  try {
    const u = new URL(url)
    const fromQuery = u.searchParams.get('id')
    if (fromQuery && /^[A-Za-z0-9_-]{10,}$/.test(fromQuery)) return fromQuery
    const m =
      u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/) ||
      u.pathname.match(/\/document\/d\/([A-Za-z0-9_-]{10,})/) ||
      u.pathname.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{10,})/) ||
      u.pathname.match(/\/presentation\/d\/([A-Za-z0-9_-]{10,})/) ||
      u.pathname.match(/\/folders\/([A-Za-z0-9_-]{10,})/)
    return m?.[1] ?? null
  } catch {
    return null
  }
}
