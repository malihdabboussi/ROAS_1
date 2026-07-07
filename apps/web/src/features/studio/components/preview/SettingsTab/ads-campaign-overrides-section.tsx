'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Switch } from '@/components/ui/forms/switch'
import type { AdCampaign } from '../../../types'
import {
  fetchMetaInstagramAccountsForPage,
  fetchMetaPixels,
  updateAdCampaign,
} from '../../../services/artifact-preview.service'
import { SettingsDropdown } from '../SettingsDropdown'

type MetaAssetProfile = {
  id: string
  label: string
  ad_account_id: string | null
  page_id: string | null
  instagram_user_id: string | null
  pixel_id: string | null
}

type MetaAccountOption = { id: string; name: string }
type MetaInstagramAccount = { id: string; username?: string }
interface AdsCampaignOverridesSectionProps {
  adCampaigns: AdCampaign[]
  setAdCampaigns: Dispatch<SetStateAction<AdCampaign[]>>
  campaignConfig: Record<string, unknown>
  metaAdAccounts: MetaAccountOption[]
  metaPages: MetaAccountOption[]
  metaInstagramAccountsByCampaign: Record<string, MetaInstagramAccount[]>
  setMetaInstagramAccountsByCampaign: Dispatch<SetStateAction<Record<string, MetaInstagramAccount[]>>>
  metaPixelsByAccount: Record<string, MetaAccountOption[]>
  setMetaPixelsByAccount: Dispatch<SetStateAction<Record<string, MetaAccountOption[]>>>
  adsSaving: Record<string, boolean>
  setAdsSaving: Dispatch<SetStateAction<Record<string, boolean>>>
  setCreatePixelForAccountId: Dispatch<SetStateAction<string | null>>
  setCreatePixelForCampaignId: Dispatch<SetStateAction<string | null>>
}

interface AdsCampaignOverrideRowProps extends Omit<AdsCampaignOverridesSectionProps, 'campaignConfig' | 'adCampaigns'> {
  adCampaign: AdCampaign
  profiles: MetaAssetProfile[]
}

export function AdsCampaignOverridesSection({
  adCampaigns,
  setAdCampaigns,
  campaignConfig,
  metaAdAccounts,
  metaPages,
  metaInstagramAccountsByCampaign,
  setMetaInstagramAccountsByCampaign,
  metaPixelsByAccount,
  setMetaPixelsByAccount,
  adsSaving,
  setAdsSaving,
  setCreatePixelForAccountId,
  setCreatePixelForCampaignId,
}: AdsCampaignOverridesSectionProps) {
  const profiles = (campaignConfig.meta_asset_profiles ?? []) as MetaAssetProfile[]

  return (
    <>
      <div className="space-y-spacing-2">
        <p className="body-3 text-foreground font-medium">Per-Campaign Overrides</p>
        <p className="typo-caption text-muted-foreground">
          Campaigns use the default profile above. Toggle override to customize individually.
        </p>
      </div>
      {adCampaigns.map((adCampaign) => (
        <AdsCampaignOverrideRow
          key={adCampaign.id}
          adCampaign={adCampaign}
          profiles={profiles}
          setAdCampaigns={setAdCampaigns}
          metaAdAccounts={metaAdAccounts}
          metaPages={metaPages}
          metaInstagramAccountsByCampaign={metaInstagramAccountsByCampaign}
          setMetaInstagramAccountsByCampaign={setMetaInstagramAccountsByCampaign}
          metaPixelsByAccount={metaPixelsByAccount}
          setMetaPixelsByAccount={setMetaPixelsByAccount}
          adsSaving={adsSaving}
          setAdsSaving={setAdsSaving}
          setCreatePixelForAccountId={setCreatePixelForAccountId}
          setCreatePixelForCampaignId={setCreatePixelForCampaignId}
        />
      ))}
    </>
  )
}

function AdsCampaignOverrideRow({
  adCampaign: ac,
  setAdCampaigns,
  profiles,
  metaAdAccounts,
  metaPages,
  metaInstagramAccountsByCampaign,
  setMetaInstagramAccountsByCampaign,
  metaPixelsByAccount,
  setMetaPixelsByAccount,
  adsSaving,
  setAdsSaving,
  setCreatePixelForAccountId,
  setCreatePixelForCampaignId,
}: AdsCampaignOverrideRowProps) {
  const acMeta = (ac.metadata as Record<string, unknown> | undefined) ?? {}
  const hasOverride = acMeta.meta_asset_profile_override === true
  const defaultProfile = profiles[0] ?? null
  const profileOptions = profiles.map((profile, index) => ({
    value: profile.id,
    label: index === 0 ? `${profile.label} (Default)` : profile.label,
  }))
  const selectedProfileId =
    (acMeta.meta_asset_profile_id as string | undefined) ?? defaultProfile?.id ?? ''
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? defaultProfile

  const patchAdCampaign = (resolve: (campaign: AdCampaign) => AdCampaign) => {
    setAdCampaigns((prev) =>
      prev.map((campaign) => (campaign.id === ac.id ? resolve(campaign) : campaign)),
    )
  }

  const setSaving = (kind: string, saving: boolean) => {
    setAdsSaving((prev) => ({ ...prev, [`${ac.id}-${kind}`]: saving }))
  }

  return (
    <div className="space-y-spacing-3">
      <div className="flex items-center justify-between">
        <p className="body-3 text-foreground font-medium">{ac.name}</p>
        <div className="flex items-center gap-2">
          <span className="typo-caption text-muted-foreground">
            {hasOverride ? 'Custom' : 'Customize'}
          </span>
          <Switch
            checked={hasOverride}
            onCheckedChange={async (checked) => {
              const nextMeta = { ...acMeta, meta_asset_profile_override: checked }
              if (!checked && defaultProfile) {
                Object.assign(nextMeta, {
                  meta_pixel_id: defaultProfile.pixel_id,
                  meta_instagram_user_id: defaultProfile.instagram_user_id,
                })
                patchAdCampaign((campaign) => ({
                  ...campaign,
                  meta_ad_account_id: defaultProfile.ad_account_id,
                  meta_page_id: defaultProfile.page_id,
                  metadata: nextMeta,
                }))
                await updateAdCampaign(ac.id, {
                  meta_ad_account_id: defaultProfile.ad_account_id,
                  meta_page_id: defaultProfile.page_id,
                  metadata: nextMeta,
                })
              } else {
                patchAdCampaign((campaign) => ({ ...campaign, metadata: nextMeta }))
                await updateAdCampaign(ac.id, { metadata: nextMeta })
              }
            }}
          />
        </div>
      </div>
      {!hasOverride && profiles.length > 1 && (
        <SettingsDropdown
          value={selectedProfileId}
          options={profileOptions}
          onChange={async (value) => {
            const profile = profiles.find((item) => item.id === value)
            if (!profile) return
            const nextMeta = {
              ...acMeta,
              meta_asset_profile_id: value,
              meta_pixel_id: profile.pixel_id,
              meta_instagram_user_id: profile.instagram_user_id,
            }
            patchAdCampaign((campaign) => ({
              ...campaign,
              meta_ad_account_id: profile.ad_account_id,
              meta_page_id: profile.page_id,
              metadata: nextMeta,
            }))
            await updateAdCampaign(ac.id, {
              meta_ad_account_id: profile.ad_account_id,
              meta_page_id: profile.page_id,
              metadata: nextMeta,
            })
          }}
          placeholder="Select profile"
        />
      )}
      {!hasOverride && selectedProfile && (
        <div className="card-glass rounded-spacing-2 p-spacing-3 space-y-spacing-1">
          <p className="typo-caption text-muted-foreground">
            {metaAdAccounts.find((account) => account.id === selectedProfile.ad_account_id)?.name ??
              'No ad account'}{' '}
            · {metaPages.find((page) => page.id === selectedProfile.page_id)?.name ?? 'No page'}
          </p>
          {selectedProfile.pixel_id && (
            <p className="typo-caption text-muted-foreground">
              Pixel:{' '}
              {(metaPixelsByAccount[selectedProfile.ad_account_id ?? ''] ?? []).find(
                (pixel) => pixel.id === selectedProfile.pixel_id,
              )?.name ?? selectedProfile.pixel_id}
            </p>
          )}
        </div>
      )}
      {hasOverride && (
        <div className="card-glass rounded-spacing-2 p-spacing-4 space-y-spacing-4">
          <OverrideDropdown
            label="Ad Account"
            saving={adsSaving[`${ac.id}-account`]}
            emptyText="No ad accounts found"
            value={ac.meta_ad_account_id ?? ''}
            options={metaAdAccounts.map((account) => ({ value: account.id, label: account.name }))}
            placeholder="Select ad account"
            onChange={async (value) => {
              patchAdCampaign((campaign) => ({
                ...campaign,
                meta_ad_account_id: value,
                metadata: { ...(campaign.metadata as Record<string, unknown>), meta_pixel_id: null },
              }))
              setSaving('account', true)
              try {
                if (value && !metaPixelsByAccount[value]) {
                  const pixels = await fetchMetaPixels(value)
                  setMetaPixelsByAccount((prev) => ({ ...prev, [value]: pixels }))
                }
                await updateAdCampaign(ac.id, {
                  meta_ad_account_id: value,
                  metadata: { ...acMeta, meta_pixel_id: null },
                })
              } catch {
                /* silent */
              } finally {
                setSaving('account', false)
              }
            }}
          />
          <OverrideDropdown
            label="Facebook Page"
            saving={adsSaving[`${ac.id}-page`]}
            emptyText="No Facebook pages found"
            value={ac.meta_page_id ?? ''}
            options={metaPages.map((page) => ({ value: page.id, label: page.name }))}
            placeholder="Select Facebook page"
            onChange={async (value) => {
              patchAdCampaign((campaign) => ({
                ...campaign,
                meta_page_id: value,
                metadata: {
                  ...(campaign.metadata as Record<string, unknown>),
                  meta_instagram_user_id: null,
                },
              }))
              setSaving('page', true)
              try {
                const igAccounts = value ? await fetchMetaInstagramAccountsForPage(value) : []
                setMetaInstagramAccountsByCampaign((prev) => ({ ...prev, [ac.id]: igAccounts }))
                await updateAdCampaign(ac.id, {
                  meta_page_id: value,
                  metadata: { ...acMeta, meta_instagram_user_id: null },
                })
              } catch {
                /* silent */
              } finally {
                setSaving('page', false)
              }
            }}
          />
          <OverrideDropdown
            label="Instagram Account"
            saving={adsSaving[`${ac.id}-instagram`]}
            emptyText={
              ac.meta_page_id
                ? 'No Instagram account connected to selected Facebook page'
                : 'Select a Facebook page first'
            }
            value={(acMeta.meta_instagram_user_id as string | undefined) ?? ''}
            options={(metaInstagramAccountsByCampaign[ac.id] ?? []).map((instagram) => ({
              value: instagram.id,
              label: instagram.username ? `@${instagram.username}` : instagram.id,
            }))}
            placeholder="Select Instagram account"
            onChange={async (value) => {
              const nextMetadata = { ...acMeta, meta_instagram_user_id: value }
              patchAdCampaign((campaign) => ({ ...campaign, metadata: nextMetadata }))
              setSaving('instagram', true)
              try {
                await updateAdCampaign(ac.id, { metadata: nextMetadata })
              } catch {
                /* silent */
              } finally {
                setSaving('instagram', false)
              }
            }}
          />
          <div className="space-y-spacing-2">
            <div className="flex items-center justify-between">
              <label className="typo-caption text-foreground font-medium">Meta Pixel ID</label>
              <div className="flex items-center gap-2">
                {adsSaving[`${ac.id}-pixel`] && (
                  <span className="typo-caption text-muted-foreground">Saving...</span>
                )}
                {ac.meta_ad_account_id && (
                  <button
                    type="button"
                    className="typo-caption text-primary hover:text-foreground font-medium transition-colors"
                    onClick={() => {
                      setCreatePixelForAccountId(ac.meta_ad_account_id!)
                      setCreatePixelForCampaignId(ac.id)
                    }}
                  >
                    + Create Pixel
                  </button>
                )}
              </div>
            </div>
            {(metaPixelsByAccount[ac.meta_ad_account_id ?? ''] ?? []).length > 0 ? (
              <>
                <SettingsDropdown
                  value={(acMeta.meta_pixel_id as string | undefined) ?? ''}
                  options={(metaPixelsByAccount[ac.meta_ad_account_id ?? ''] ?? []).map((pixel) => ({
                    value: pixel.id,
                    label: `${pixel.name} (${pixel.id})`,
                  }))}
                  onChange={async (value) => {
                    const nextMetadata = { ...acMeta, meta_pixel_id: value }
                    patchAdCampaign((campaign) => ({ ...campaign, metadata: nextMetadata }))
                    setSaving('pixel', true)
                    try {
                      await updateAdCampaign(ac.id, { metadata: nextMetadata })
                    } catch {
                      /* silent */
                    } finally {
                      setSaving('pixel', false)
                    }
                  }}
                  placeholder="Select Meta Pixel"
                  searchable
                />
                {(acMeta.meta_pixel_id as string | undefined) && (
                  <p className="typo-caption text-muted-foreground">
                    Pixel ID: {acMeta.meta_pixel_id as string}
                  </p>
                )}
              </>
            ) : (
              <p className="body-3 text-muted-foreground">
                {ac.meta_ad_account_id ? 'No pixels found for this ad account' : 'Select an ad account first'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface OverrideDropdownProps {
  label: string
  saving?: boolean
  emptyText: string
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  onChange: (value: string) => void | Promise<void>
}

function OverrideDropdown({
  label,
  saving,
  emptyText,
  value,
  options,
  placeholder,
  onChange,
}: OverrideDropdownProps) {
  return (
    <div className="space-y-spacing-2">
      <div className="flex items-center justify-between">
        <label className="typo-caption text-foreground font-medium">{label}</label>
        {saving && <span className="typo-caption text-muted-foreground">Saving...</span>}
      </div>
      {options.length > 0 ? (
        <SettingsDropdown
          value={value}
          options={options}
          onChange={onChange}
          placeholder={placeholder}
          searchable
        />
      ) : (
        <p className="body-3 text-muted-foreground">{emptyText}</p>
      )}
    </div>
  )
}
