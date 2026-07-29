'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { groupFlowSpacesByCampaign } from '@/lib/flows/flow-space-picker.utils'
import {
  AutomationCategorizedSelect,
  type AutomationCategorizedSection,
} from '../automations/AutomationCategorizedSelect'

type CampaignSpaceOption = {
  spaceId: string
  campaignId: string
  title: string
  schema?: {
    icon?: string
    icon_color?: string
  } | null
}

export function QuickMissionCampaignSpaceSelect({
  clients,
  value,
  onChange,
}: {
  clients: CampaignSpaceOption[]
  value: string
  onChange: (spaceId: string) => void
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    void fetchCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
  }, [])

  const sections = useMemo<AutomationCategorizedSection[]>(() => {
    const groups = groupFlowSpacesByCampaign(
      clients.map((client) => ({
        id: client.spaceId,
        title: client.title,
        campaign_id: client.campaignId,
        schema: client.schema,
      })),
      campaigns,
    )
    return groups.map((group) => ({
      heading: group.heading,
      options: group.spaces.map((space) => ({
        value: space.id,
        label: space.title ?? 'Untitled space',
        description: group.heading,
      })),
    }))
  }, [campaigns, clients])

  return (
    <AutomationCategorizedSelect
      sections={sections}
      crossScopeSections={sections}
      value={value}
      onChange={onChange}
      placeholder="Select a campaign and space…"
      searchPlaceholder="Search campaigns & spaces…"
    />
  )
}
