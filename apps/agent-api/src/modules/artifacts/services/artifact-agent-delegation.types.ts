export type TeamMember = { agent_key: string; name: string; role: string }

export type TemplateOption = { role_key: string; default_name: string; role_title: string }

export type TargetResolution =
  | { status: 'available'; agentKey: string; name: string; role: string; imageUrl?: string }
  | { status: 'needs_assign'; agentKey: string; name: string; role: string; imageUrl?: string }
  | {
      status: 'needs_hire'
      suggestions: TemplateOption[]
    }
  | {
      status: 'not_found'
      message: string
      current_team: TeamMember[]
      available_templates: TemplateOption[]
    }

export interface A2ATurn {
  from: string
  fromName: string
  fromImage?: string
  content: string
  turnIndex: number
  turnType: 'message' | 'thinking' | 'tool_use' | 'tool_result' | 'ui_block'
  toolName?: string
  blockData?: Record<string, unknown>
  timestamp: number
}

export interface StreamedDelegationResult {
  outputText: string
  toolTurns: A2ATurn[]
}
