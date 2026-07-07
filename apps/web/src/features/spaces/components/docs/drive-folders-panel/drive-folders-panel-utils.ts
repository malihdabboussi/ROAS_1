import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import type { DriveFolderMapping } from '@/lib/services/drive-mappings-api'

/** Matches `w-80` for viewport clamping. */
export const DRIVE_FOLDERS_MENU_WIDTH_PX = 320

/** Brand asset from `getIntegrationLogoPath` / public Integrations. */
export const GOOGLE_DRIVE_TOOLBAR_LOGO =
  getIntegrationLogoPath('google_drive') ?? '/Integrations/GoogleDrive.png'

export function formatLastSynced(value: string | null): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString()
}

export function driveMappingStatusLabel(mapping: DriveFolderMapping): string {
  if (mapping.sync_status === 'syncing') return 'Syncing…'
  if (mapping.sync_status === 'error') return 'Error'
  if (mapping.last_sync_error) return 'Error'
  if (!mapping.last_synced_at) return 'Queued'
  return 'Up to date'
}

export function driveMappingStatusTooltip(mapping: DriveFolderMapping): string {
  const parts: string[] = [driveMappingStatusLabel(mapping)]
  if (mapping.last_synced_at) {
    parts.push(`Last synced: ${formatLastSynced(mapping.last_synced_at)}`)
  }
  if (mapping.last_sync_error) {
    parts.push(mapping.last_sync_error)
  }
  if (!mapping.enabled) {
    parts.push('Sync disabled')
  }
  return parts.join(' · ')
}
