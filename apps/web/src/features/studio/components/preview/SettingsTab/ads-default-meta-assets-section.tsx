'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { AdCampaign } from '../../../types'
import {
  fetchMetaInstagramAccountsForPage,
  fetchMetaPixels,
  updateAdCampaign,
} from '../../../services/artifact-preview.service'
import { updateCampaign } from '../../../services/campaign.service'
import { SettingsDropdown } from '../SettingsDropdown'

type MetaAssetProfile = {
  id: string
  label: string
  ad_account_id: string | null
  page_id: string | null
  instagram_user_id: string | null
  pixel_id: string | null
}

type MetaAccountOption = {
  id: string
  name: string
}

type MetaInstagramAccount = {
  id: string
  username?: string
}

interface AdsDefaultMetaAssetsSectionProps {
  campaignId: string
  campaignConfig: Record<string, unknown>
  setCampaignConfig: Dispatch<SetStateAction<Record<string, unknown>>>
  adCampaigns: AdCampaign[]
  setAdCampaigns: Dispatch<SetStateAction<AdCampaign[]>>
  metaAdAccounts: MetaAccountOption[]
  metaPages: MetaAccountOption[]
  metaInstagramAccountsByCampaign: Record<string, MetaInstagramAccount[]>
  setMetaInstagramAccountsByCampaign: Dispatch<
    SetStateAction<Record<string, MetaInstagramAccount[]>>
  >
  metaPixelsByAccount: Record<string, MetaAccountOption[]>
  setMetaPixelsByAccount: Dispatch<SetStateAction<Record<string, MetaAccountOption[]>>>
}

export function AdsDefaultMetaAssetsSection({
  campaignId,
  campaignConfig,
  setCampaignConfig,
  adCampaigns,
  setAdCampaigns,
  metaAdAccounts,
  metaPages,
  metaInstagramAccountsByCampaign,
  setMetaInstagramAccountsByCampaign,
  metaPixelsByAccount,
  setMetaPixelsByAccount,
}: AdsDefaultMetaAssetsSectionProps) {
  const profiles = (campaignConfig.meta_asset_profiles ?? []) as MetaAssetProfile[]
  const hasDefault = profiles.length > 0

  const saveProfiles = async (next: MetaAssetProfile[]) => {
    const nextConfig = { ...campaignConfig, meta_asset_profiles: next }
    setCampaignConfig(nextConfig)
    await updateCampaign(campaignId, { config: nextConfig })
  }

  const applyDefaultToAllCampaigns = async (profile: MetaAssetProfile) => {
    for (const ac of adCampaigns) {
      const acMeta = (ac.metadata as Record<string, unknown> | undefined) ?? {}
      const hasOverride = acMeta.meta_asset_profile_override === true
      if (hasOverride) continue
      const nextMeta = {
        ...acMeta,
        meta_pixel_id: profile.pixel_id,
        meta_instagram_user_id: profile.instagram_user_id,
      }
      setAdCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === ac.id
            ? {
                ...campaign,
                meta_ad_account_id: profile.ad_account_id,
                meta_page_id: profile.page_id,
                metadata: nextMeta,
              }
            : campaign,
        ),
      )
      await updateAdCampaign(ac.id, {
        meta_ad_account_id: profile.ad_account_id,
        meta_page_id: profile.page_id,
        metadata: nextMeta,
      })
    }
  }

  return (
    <div className="space-y-spacing-4">
      <div className="flex items-center justify-between">
        <p className="body-3 text-foreground font-medium">Default Meta Assets</p>
        {!hasDefault && (
          <button
            type="button"
            className="typo-caption text-primary hover:text-foreground font-medium transition-colors"
            onClick={() => {
              void saveProfiles([
                {
                  id: 'default',
                  label: 'Default',
                  ad_account_id: null,
                  page_id: null,
                  instagram_user_id: null,
                  pixel_id: null,
                },
              ])
            }}
          >
            + Add Profile
          </button>
        )}
      </div>
      {profiles.map((profile, idx) => (
        <div key={profile.id} className="card-glass rounded-spacing-2 p-spacing-4 space-y-spacing-4">
          <div className="flex items-center justify-between">
            <span className="body-3 text-foreground font-medium">
              {profile.label}
              {idx === 0 ? ' (Default)' : ''}
            </span>
            {profiles.length > 1 && idx > 0 && (
              <button
                type="button"
                className="typo-caption text-destructive hover:text-foreground"
                onClick={() => void saveProfiles(profiles.filter((_, index) => index !== idx))}
              >
                Remove
              </button>
            )}
          </div>
          <div className="space-y-spacing-2">
            <label className="typo-caption text-foreground font-medium">Ad Account</label>
            {metaAdAccounts.length > 0 ? (
              <SettingsDropdown
                value={profile.ad_account_id ?? ''}
                options={metaAdAccounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
                onChange={async (value) => {
                  const next = profiles.map((item, index) =>
                    index === idx
                      ? { ...item, ad_account_id: value, pixel_id: null }
                      : item,
                  )
                  await saveProfiles(next)
                  if (value && !metaPixelsByAccount[value]) {
                    const pixels = await fetchMetaPixels(value)
                    setMetaPixelsByAccount((prev) => ({ ...prev, [value]: pixels }))
                  }
                  if (idx === 0) {
                    void applyDefaultToAllCampaigns({
                      ...profile,
                      ad_account_id: value,
                      pixel_id: null,
                    })
                  }
                }}
                placeholder="Select ad account"
                searchable
              />
            ) : (
              <p className="body-3 text-muted-foreground">No ad accounts found</p>
            )}
          </div>
          <div className="space-y-spacing-2">
            <label className="typo-caption text-foreground font-medium">Facebook Page</label>
            {metaPages.length > 0 ? (
              <SettingsDropdown
                value={profile.page_id ?? ''}
                options={metaPages.map((page) => ({ value: page.id, label: page.name }))}
                onChange={async (value) => {
                  const igAccounts = value ? await fetchMetaInstagramAccountsForPage(value) : []
                  setMetaInstagramAccountsByCampaign((prev) => ({
                    ...prev,
                    [`profile-${profile.id}`]: igAccounts,
                  }))
                  const next = profiles.map((item, index) =>
                    index === idx
                      ? { ...item, page_id: value, instagram_user_id: null }
                      : item,
                  )
                  await saveProfiles(next)
                  if (idx === 0) {
                    void applyDefaultToAllCampaigns({
                      ...profile,
                      page_id: value,
                      instagram_user_id: null,
                    })
                  }
                }}
                placeholder="Select Facebook page"
                searchable
              />
            ) : (
              <p className="body-3 text-muted-foreground">No Facebook pages found</p>
            )}
          </div>
          <div className="space-y-spacing-2">
            <label className="typo-caption text-foreground font-medium">Instagram Account</label>
            {(metaInstagramAccountsByCampaign[`profile-${profile.id}`] ?? []).length > 0 ? (
              <SettingsDropdown
                value={profile.instagram_user_id ?? ''}
                options={(metaInstagramAccountsByCampaign[`profile-${profile.id}`] ?? []).map(
                  (instagram) => ({
                    value: instagram.id,
                    label: instagram.username ? `@${instagram.username}` : instagram.id,
                  }),
                )}
                onChange={async (value) => {
                  const next = profiles.map((item, index) =>
                    index === idx ? { ...item, instagram_user_id: value } : item,
                  )
                  await saveProfiles(next)
                  if (idx === 0) {
                    void applyDefaultToAllCampaigns({
                      ...profile,
                      instagram_user_id: value,
                    })
                  }
                }}
                placeholder="Select Instagram account"
                searchable
              />
            ) : (
              <p className="body-3 text-muted-foreground">
                {profile.page_id ? 'No Instagram account found' : 'Select a Facebook page first'}
              </p>
            )}
          </div>
          <div className="space-y-spacing-2">
            <label className="typo-caption text-foreground font-medium">Meta Pixel</label>
            {(metaPixelsByAccount[profile.ad_account_id ?? ''] ?? []).length > 0 ? (
              <SettingsDropdown
                value={profile.pixel_id ?? ''}
                options={(metaPixelsByAccount[profile.ad_account_id ?? ''] ?? []).map((pixel) => ({
                  value: pixel.id,
                  label: `${pixel.name} (${pixel.id})`,
                }))}
                onChange={async (value) => {
                  const next = profiles.map((item, index) =>
                    index === idx ? { ...item, pixel_id: value } : item,
                  )
                  await saveProfiles(next)
                  if (idx === 0) {
                    void applyDefaultToAllCampaigns({ ...profile, pixel_id: value })
                  }
                }}
                placeholder="Select Meta Pixel"
                searchable
              />
            ) : (
              <p className="body-3 text-muted-foreground">
                {profile.ad_account_id ? 'No pixels found' : 'Select an ad account first'}
              </p>
            )}
          </div>
        </div>
      ))}
      {hasDefault && (
        <button
          type="button"
          className="typo-caption text-primary hover:text-foreground font-medium transition-colors"
          onClick={() => {
            const newId = `profile-${Date.now()}`
            void saveProfiles([
              ...profiles,
              {
                id: newId,
                label: `Profile ${profiles.length + 1}`,
                ad_account_id: null,
                page_id: null,
                instagram_user_id: null,
                pixel_id: null,
              },
            ])
          }}
        >
          + Add another profile
        </button>
      )}
    </div>
  )
}
