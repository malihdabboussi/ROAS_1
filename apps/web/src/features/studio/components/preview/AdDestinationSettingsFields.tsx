import { ExternalLink } from 'lucide-react'
import type { Ad } from '../../types'
import { SettingsField, type FieldState } from './ad-settings-panel-primitives'

interface AdDestinationSettingsFieldsProps {
  ad: Ad
  fieldStates: Record<string, FieldState>
  simpleMode: boolean
  onChange: (field: string, value: string | null) => void
}

export function AdDestinationSettingsFields({
  ad,
  fieldStates,
  simpleMode,
  onChange,
}: AdDestinationSettingsFieldsProps) {
  if (ad.ad_format === 'CAROUSEL') return null

  return (
    <>
      <SettingsField fieldState={fieldStates['destination_url']}>
        <div className="relative">
          <input
            type="url"
            value={ad.destination_url ?? ''}
            onChange={(event) => onChange('destination_url', event.target.value)}
            className="input-glass body-3 w-full pr-8"
            placeholder="https://..."
          />
          {ad.destination_url && (
            <a
              href={ad.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </SettingsField>

      {!simpleMode && (
        <SettingsField label="Display Link" fieldState={fieldStates['display_link']}>
          <input
            type="text"
            value={ad.display_link ?? ''}
            onChange={(event) => onChange('display_link', event.target.value || null)}
            className="input-glass body-3 w-full"
            placeholder="yoursite.com (shown on ad)"
          />
        </SettingsField>
      )}
    </>
  )
}
