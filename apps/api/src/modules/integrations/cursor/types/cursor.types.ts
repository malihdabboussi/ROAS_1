export type CursorAgentStatus = 'CREATING' | 'ACTIVE' | 'FINISHED' | 'ERROR' | 'EXPIRED'

export type CreateAgentRequest = {
  prompt: { text: string; images?: Array<{ data: string; mimeType: string }> }
  model?: { id: string; params?: Array<{ id: string; value: string }> }
  repos: Array<{ url: string; startingRef?: string }>
  branchName?: string
  autoGenerateBranch?: boolean
  autoCreatePR?: boolean
}

export type CreateAgentResponse = {
  agent: {
    id: string
    name?: string
    status: CursorAgentStatus
    url?: string
    branchName?: string
    autoCreatePR?: boolean
    createdAt?: string
    updatedAt?: string
    latestRunId?: string
  }
  run: {
    id: string
    agentId: string
    status: string
    createdAt?: string
    updatedAt?: string
  }
}

export type CursorWebhookEvent = {
  event: string
  timestamp: string
  id: string
  status: CursorAgentStatus | string
  source?: {
    repository?: string
    ref?: string
  }
  target?: {
    url?: string
    branchName?: string
    prUrl?: string
  }
  summary?: string
}

export type CursorConnection = {
  integrationRowId: string
  userId: string
  orgId: string | null
  apiKey: string
  webhookSecret: string | null
}
