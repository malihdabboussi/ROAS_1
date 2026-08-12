export interface ChatInputPlusMenuAgentOption {
  key: string
  name: string
  roleLabel?: string | null
  avatarUrl?: string | null
}

export interface ChatInputPlusMenuAgentPickerConfig {
  selectedAgentKey: string
  agents: ChatInputPlusMenuAgentOption[]
  onSelect: (agentKey: string) => void
}
