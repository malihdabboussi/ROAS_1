'use client'

import type { Campaign } from '@/lib/campaigns/campaign-api'

export function CampaignDestinationField({
  value,
  campaigns,
  onChange,
  description = "People who save their email in this widget will appear in that campaign's Contacts view.",
}: {
  value: string | null
  campaigns: Campaign[]
  onChange: (campaignId: string | null) => void
  description?: string
}) {
  return (
    <div>
      <p className="body-4 mb-1 text-muted-foreground">Send new contacts to</p>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        className="body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full border border-border bg-surface-subtle text-foreground outline-none focus:border-primary"
      >
        <option value="">No campaign</option>
        {campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </select>
      <p className="body-4 mt-1 text-muted-foreground">{description}</p>
    </div>
  )
}
