export type McpDomain =
  | 'shared'
  | 'universal'
  | 'marketing'
  | 'analyst'
  | 'developer'
  | 'operations'

export interface McpServerRow {
  id: string
  project_id: string
  name: string
  description: string | null
  server_url: string
  vault_secret_id: string | null
  domain: McpDomain
  agent_enabled: boolean
  enabled: boolean
  cached_tools: McpCachedTool[]
  cached_resources?: McpCachedResource[]
  last_connected_at: string | null
  created_at: string
  updated_at: string
}

export interface McpCachedTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface McpCachedResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface McpServerSummary {
  id: string
  name: string
  description: string | null
  server_url: string
  domain: McpDomain
  agent_enabled: boolean
  enabled: boolean
  tool_count: number
  last_connected_at: string | null
}

export interface McpToolCallResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>
  isError?: boolean
  structuredContent?: unknown
}

export interface McpResourceReadResult {
  contents: Array<Record<string, unknown>>
}
