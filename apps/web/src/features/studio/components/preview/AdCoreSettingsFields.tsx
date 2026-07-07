import type { Ad, AdFormat } from '../../types'
import { stripCopyFromAdHeadline } from '../../utils/ad-headline'
import { SettingsField, type FieldState } from './ad-settings-panel-primitives'
import { AdFormatSelector } from './AdFormatSelector'
import { SettingsDropdown } from './SettingsDropdown'

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'BOOK_NOW', label: 'Book Now' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'WATCH_MORE', label: 'Watch More' },
  { value: 'SEND_MESSAGE', label: 'Send Message' },
]

interface AdCoreSettingsFieldsProps {
  ad: Ad
  fieldStates: Record<string, FieldState>
  simpleMode: boolean
  onChange: (field: string, value: string | null) => void
  onSelectChange: (field: string, value: string | null) => void
  onAdFormatChange: (value: AdFormat) => void
}

export function AdCoreSettingsFields({
  ad,
  fieldStates,
  simpleMode,
  onChange,
  onSelectChange,
  onAdFormatChange,
}: AdCoreSettingsFieldsProps) {
  return (
    <>
      <SettingsField fieldState={fieldStates['headline']}>
        <input
          type="text"
          value={stripCopyFromAdHeadline(ad.headline)}
          onChange={(event) => onChange('headline', event.target.value)}
          className="input-glass body-3 w-full"
          placeholder="Enter headline"
        />
      </SettingsField>

      <SettingsField fieldState={fieldStates['primary_text']}>
        <textarea
          value={ad.primary_text ?? ''}
          onChange={(event) => onChange('primary_text', event.target.value)}
          className="input-glass body-3 min-h-[80px] w-full resize-y"
          placeholder="Primary text"
          rows={3}
        />
      </SettingsField>

      <SettingsField fieldState={fieldStates['cta_type']}>
        <SettingsDropdown
          value={ad.cta_type ?? 'LEARN_MORE'}
          options={CTA_OPTIONS}
          onChange={(value) => onSelectChange('cta_type', value)}
        />
      </SettingsField>

      <div className="border-border border-t" />

      <SettingsField>
        <AdFormatSelector value={ad.ad_format} onChange={onAdFormatChange} />
      </SettingsField>

      {!simpleMode && (
        <SettingsField label="Description" fieldState={fieldStates['description']}>
          <input
            type="text"
            value={ad.description ?? ''}
            onChange={(event) => onChange('description', event.target.value || null)}
            className="input-glass body-3 w-full"
            placeholder="Optional description"
          />
        </SettingsField>
      )}
    </>
  )
}
