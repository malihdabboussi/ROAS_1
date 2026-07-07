import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react'
import type { MissionAgent } from '@/lib/agents'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import type { ModelStrategyId } from '../../constants/team.constants'
import type { AgentChannel } from '../../services/channels.service'

export type CommsSectionKey =
  | 'modelVoice'
  | 'communication'
  | 'channels'
  | 'dailySummary'
  | 'websiteWidget'

export interface CommsSectionHeaderProps {
  title: string
  collapsed: boolean
  onToggle: () => void
  first: boolean
  trailing?: ReactNode
}

export interface TeamCommunicationTabProps {
  selected: MissionAgent | null
  selectedModelId: string
  modelOptions: LlmModelOption[]
  communicationSaving: boolean
  communicationError: string | null
  modelDropdownOpen: boolean
  setModelDropdownOpen: Dispatch<SetStateAction<boolean>>
  modelDropdownRef: MutableRefObject<HTMLDivElement | null>
  modelDropdownBtnRef: MutableRefObject<HTMLButtonElement | null>
  modelDropdownPos: { top: number; left: number; width: number }
  handleCommunicationStrategyChange: (strategyId: ModelStrategyId) => Promise<void>
  handleCommunicationModelChange: (nextModelId: string) => Promise<void>
  handleVoiceChange: (voiceName: string | null) => Promise<void>
  handleCommunicationStyleChange: (style: string) => Promise<void>
  channelsLoading: boolean
  channels: AgentChannel[]
  setChannels: Dispatch<SetStateAction<AgentChannel[]>>
  channelDisconnecting: boolean
  setChannelDisconnecting: Dispatch<SetStateAction<boolean>>
  slackDisconnecting: boolean
  setSlackDisconnecting: Dispatch<SetStateAction<boolean>>
  setShowTelegramSetup: (value: boolean) => void
  setShowSlackSetup: (value: boolean) => void
  preferredChannel: 'studio' | 'telegram' | 'slack'
  setPreferredChannel: Dispatch<SetStateAction<'studio' | 'telegram' | 'slack'>>
  channelSaving: boolean
  setChannelSaving: Dispatch<SetStateAction<boolean>>
  digestEnabled: boolean
  setDigestEnabled: Dispatch<SetStateAction<boolean>>
  digestSaving: boolean
  setDigestSaving: Dispatch<SetStateAction<boolean>>
  digestTime: string
  setDigestTime: Dispatch<SetStateAction<string>>
  digestDropdownOpen: boolean
  setDigestDropdownOpen: Dispatch<SetStateAction<boolean>>
  digestDropdownBtnRef: MutableRefObject<HTMLButtonElement | null>
  digestDropdownPos: { top: number; left: number; width: number }
  userPublicSlug: string | null
  onPublicPageToggle: (agentKey: string, enabled: boolean) => Promise<void>
  onPublicSlugAssign: (slug: string) => Promise<void>
  disabled?: boolean
}
