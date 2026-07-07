import { ChevronDown } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import type { Ad } from '../../types'
import { SettingsDropdown } from './SettingsDropdown'
import { SettingsField, SettingsSection } from './ad-settings-panel-primitives'

type AdSetupType = 'create_ad' | 'use_existing_post'

interface AdAdvancedSettingsSectionsProps {
  ad: Ad
  simpleMode: boolean
  advancedExpanded: boolean
  refreshError: string | null
  adPageId: string | null
  adIgUserId: string | null
  effectivePageId: string | null
  campaignPageName: string | null
  metaPages: Array<{ id: string; name: string }>
  metaIgAccounts: Array<{ id: string; username?: string; profile_pic?: string }>
  partnershipAd: boolean
  adSetupType: AdSetupType
  existingPostId: string
  onToggleAdvancedExpanded: () => void
  onSetMetaPageId: (value: string) => void
  onSetInstagramUserId: (value: string) => void
  onSetPartnershipAd: (checked: boolean) => void
  onSetAdSetupType: (value: AdSetupType) => void
  onSetExistingPostId: (value: string) => void
  onSaveExistingPostId: () => void
  onOpenSelectPostModal: () => void
}

export function AdAdvancedSettingsSections({
  ad,
  simpleMode,
  advancedExpanded,
  refreshError,
  adPageId,
  adIgUserId,
  effectivePageId,
  campaignPageName,
  metaPages,
  metaIgAccounts,
  partnershipAd,
  adSetupType,
  existingPostId,
  onToggleAdvancedExpanded,
  onSetMetaPageId,
  onSetInstagramUserId,
  onSetPartnershipAd,
  onSetAdSetupType,
  onSetExistingPostId,
  onSaveExistingPostId,
  onOpenSelectPostModal,
}: AdAdvancedSettingsSectionsProps) {
  return (
    <>
      {!simpleMode && (
        <SettingsSection title="Tracking">
          {refreshError && <p className="typo-caption text-destructive">{refreshError}</p>}
          <SettingsField label="URL Parameters">
            <p className="typo-caption text-muted-foreground">
              Auto-generated UTM parameters appended to your destination URL when publishing to
              Meta.
            </p>
            <div className="bg-secondary mt-1.5 rounded-lg p-3">
              <code className="typo-caption text-muted-foreground break-all">
                {ad.tracking_url
                  ? new URL(ad.tracking_url).search.replace('?', '').replace(/&/g, '\n&')
                  : 'utm_source=meta&utm_medium=paid&utm_content=' + ad.id}
              </code>
            </div>
          </SettingsField>
          <SettingsField label="Tracking URL Preview">
            <div className="bg-secondary rounded-lg p-3">
              <code className="typo-caption text-foreground break-all">
                {ad.tracking_url ||
                  (ad.destination_url
                    ? ad.destination_url + '?utm_source=meta&utm_medium=paid&utm_content=' + ad.id
                    : 'Set a destination URL first')}
              </code>
            </div>
          </SettingsField>
        </SettingsSection>
      )}

      <button
        type="button"
        onClick={onToggleAdvancedExpanded}
        className="border-border bg-secondary/30 typo-caption hover:bg-secondary/50 flex items-center gap-2 rounded-full border px-4 py-2 font-medium transition-colors"
      >
        {advancedExpanded ? (
          '← Back to Simple Mode'
        ) : (
          <>
            Enter Advanced Mode
            <ChevronDown className="h-3.5 w-3.5" />
          </>
        )}
      </button>

      {advancedExpanded && (
        <>
          <SettingsSection title="Identity">
            <p className="typo-caption text-muted-foreground -mt-2">
              The profiles that will be used in your ad.
            </p>
            <SettingsField label="Facebook Page">
              <SettingsDropdown
                value={adPageId ?? 'campaign_default'}
                options={[
                  {
                    value: 'campaign_default',
                    label: `Campaign default${campaignPageName ? ` (${campaignPageName})` : ''}`,
                  },
                  ...metaPages.map((page) => ({ value: page.id, label: page.name })),
                ]}
                onChange={onSetMetaPageId}
              />
            </SettingsField>
            <SettingsField label="Instagram account">
              {metaIgAccounts.length > 0 ? (
                <SettingsDropdown
                  value={adIgUserId ?? metaIgAccounts[0]?.id ?? ''}
                  options={metaIgAccounts.map((account) => ({
                    value: account.id,
                    label: account.username || account.id,
                  }))}
                  onChange={onSetInstagramUserId}
                />
              ) : (
                <div className="bg-secondary rounded-lg px-3 py-2">
                  <span className="body-3 text-muted-foreground">
                    {effectivePageId ? 'Loading...' : 'Select a page first'}
                  </span>
                </div>
              )}
            </SettingsField>
          </SettingsSection>

          <SettingsSection title="Partnership ad">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-3 text-foreground font-medium">Partnership ad</p>
                <p className="typo-caption text-muted-foreground mt-0.5">
                  Run ads with creators, brands and other businesses.
                </p>
              </div>
              <Switch checked={partnershipAd} onCheckedChange={onSetPartnershipAd} />
            </div>
          </SettingsSection>

          <SettingsSection title="Ad setup">
            <div className="space-y-2">
              {[
                { value: 'create_ad' as const, label: 'Create ad' },
                { value: 'use_existing_post' as const, label: 'Use existing post' },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5"
                  onClick={() => onSetAdSetupType(option.value)}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      adSetupType === option.value ? 'border-primary' : 'border-border'
                    }`}
                  >
                    {adSetupType === option.value && (
                      <span className="bg-primary h-2 w-2 rounded-full" />
                    )}
                  </span>
                  <span className="body-3 text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
            {adSetupType === 'use_existing_post' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={existingPostId}
                  onChange={(event) => onSetExistingPostId(event.target.value)}
                  onBlur={onSaveExistingPostId}
                  className="input-glass body-3 flex-1"
                  placeholder="e.g. 17844493467652524"
                />
                <button
                  type="button"
                  onClick={onOpenSelectPostModal}
                  className="body-3 text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Select a post
                </button>
              </div>
            )}
          </SettingsSection>
        </>
      )}
    </>
  )
}
