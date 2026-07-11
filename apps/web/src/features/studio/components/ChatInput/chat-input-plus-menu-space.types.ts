export interface ChatInputPlusMenuSpaceOption {
  id: string
  title: string
}

export interface ChatInputPlusMenuSpaceGroup {
  campaignId: string
  campaignName: string
  spaces: ChatInputPlusMenuSpaceOption[]
}

export interface ChatInputPlusMenuSpacePickerConfig {
  selectedSpaceId: string | null
  selectedLabel: string
  defaultSpaceTitle: string | null
  isOrgOnly: boolean
  groups: ChatInputPlusMenuSpaceGroup[]
  onSelect: (spaceId: string | null) => void
}
