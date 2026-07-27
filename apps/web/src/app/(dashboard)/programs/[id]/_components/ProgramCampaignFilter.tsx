'use client'

import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'

export function ProgramCampaignFilter({
  campaignId,
  campaigns,
  onChange,
}: {
  campaignId: string
  campaigns: Array<{ id: string; name: string }>
  onChange: (campaignId: string) => void
}) {
  return (
    <SettingsSelect
      value={campaignId}
      options={[
        { value: '', label: 'All campaigns' },
        ...campaigns.map((campaign) => ({
          value: campaign.id,
          label: campaign.name,
        })),
      ]}
      onChange={onChange}
      wrapperClassName="w-spacing-48 relative"
      triggerClassName="input-glass rounded-spacing-2 gap-spacing-2 h-spacing-9 px-spacing-3 flex w-full items-center justify-between"
      menuMinWidth={192}
    />
  )
}
