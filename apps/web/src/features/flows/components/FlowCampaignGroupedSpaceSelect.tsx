'use client'

import { useEffect, useMemo, useState } from 'react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import {
  AutomationCategorizedSelect,
  type AutomationCategorizedSection,
} from '@/features/spaces/components/automations/AutomationCategorizedSelect'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import {
  groupFlowSpacesByCampaign,
  type FlowSpacePickerItem,
} from '@/lib/flows/flow-space-picker.utils'
import { cn } from '@/lib/utils/cn'

function spaceOptionLeading(space: FlowSpacePickerItem) {
  const iconName = space.schema?.icon ?? 'layout-grid'
  const color = getIconColor(space.schema?.icon_color)
  return <LucideIcon name={iconName} className={cn('icon-xs shrink-0', color.textColor)} />
}

function groupsToSections(groups: ReturnType<typeof groupFlowSpacesByCampaign>): AutomationCategorizedSection[] {
  return groups.map((group) => ({
    heading: group.heading,
    options: group.spaces.map((space) => ({
      value: space.id,
      label: space.title ?? 'Untitled space',
      description: group.heading,
      leading: spaceOptionLeading(space),
    })),
  }))
}

export function FlowCampaignGroupedSpaceSelect({
  spaces,
  value,
  onChange,
  placeholder = 'Select space',
  searchPlaceholder = 'Search campaigns & spaces…',
  disabled = false,
}: {
  spaces: FlowSpacePickerItem[]
  value: string
  onChange: (spaceId: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    void fetchCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
  }, [])

  const sections = useMemo(() => {
    const groups = groupFlowSpacesByCampaign(spaces, campaigns)
    return groupsToSections(groups)
  }, [campaigns, spaces])

  return (
    <AutomationCategorizedSelect
      sections={sections}
      crossScopeSections={sections}
      value={value}
      onChange={(next) => onChange(next)}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
    />
  )
}
