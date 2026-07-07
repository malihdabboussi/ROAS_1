export type PageCapture = {
  url: string
  title: string
  description: string
  selectionText: string
  articleText: string | null
  articleTitle: string | null
}

export type BrainScopeType = 'user' | 'agent' | 'campaign'

/** Target for enqueue APIs */
export type BrainScopeOption = {
  id: string
  label: string
  scopeType: BrainScopeType
  brainId: string | null
  campaignId: string | null
  agentKey: string | null
  /** Campaign scope only: `agent_settings.model_strategy` (Studio parity). */
  campaignModelStrategy?: string | null
}

export type LlmModelOption = {
  id: string
  label: string
  contextWindow: number
  supportsImages: boolean
}

export type NsBrainRow = {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  is_default: boolean
  agent_id: string | null
  tags: string[] | null
}

export type CampaignRow = {
  id: string
  name: string
  config: Record<string, unknown> | null
}

export type OrgMembership = {
  id: string
  role: string
  status: string
  org_id: string
  organizations: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    account_type: string
    status: string
  }
}
