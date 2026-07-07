'use client'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { AdCampaign } from '../../../types'
import { AdsCampaignOverridesSection } from './ads-campaign-overrides-section'
import { AdsDefaultMetaAssetsSection } from './ads-default-meta-assets-section'

type MetaAccountOption = {
  id: string
  name: string
}

type MetaInstagramAccount = {
  id: string
  username?: string
}

interface AdsSettingsSectionProps {
  metaConnected: boolean | null
  metaConnectionCard: ReactNode
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
  adsSaving: Record<string, boolean>
  setAdsSaving: Dispatch<SetStateAction<Record<string, boolean>>>
  setCreatePixelForAccountId: Dispatch<SetStateAction<string | null>>
  setCreatePixelForCampaignId: Dispatch<SetStateAction<string | null>>
}

export function AdsSettingsSection({
  metaConnected,
  metaConnectionCard,
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
  adsSaving,
  setAdsSaving,
  setCreatePixelForAccountId,
  setCreatePixelForCampaignId,
}: AdsSettingsSectionProps) {
  return (
    <div className="max-w-xl space-y-8">
      {metaConnected === false ? (
        metaConnectionCard || (
          <div className="card-glass rounded-spacing-2 space-y-spacing-3 p-spacing-5">
            <p className="body-3 text-muted-foreground">Meta integration unavailable.</p>
          </div>
        )
      ) : (
        <div className="space-y-spacing-2">
          <p className="body-3 text-muted-foreground">
            Configure your default Meta assets. Ad campaigns will inherit these unless overridden.
          </p>
        </div>
      )}

      {metaConnected === false ? null : (
        <>
          <AdsDefaultMetaAssetsSection
            campaignId={campaignId}
            campaignConfig={campaignConfig}
            setCampaignConfig={setCampaignConfig}
            adCampaigns={adCampaigns}
            setAdCampaigns={setAdCampaigns}
            metaAdAccounts={metaAdAccounts}
            metaPages={metaPages}
            metaInstagramAccountsByCampaign={metaInstagramAccountsByCampaign}
            setMetaInstagramAccountsByCampaign={setMetaInstagramAccountsByCampaign}
            metaPixelsByAccount={metaPixelsByAccount}
            setMetaPixelsByAccount={setMetaPixelsByAccount}
          />

          <div className="border-border border-t" />

          <AdsCampaignOverridesSection
            adCampaigns={adCampaigns}
            setAdCampaigns={setAdCampaigns}
            campaignConfig={campaignConfig}
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
        </>
      )}
    </div>
  )
}
