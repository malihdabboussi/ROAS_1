export const ROAS_MCP_RESOURCE_URL = 'https://mcp.roas.io'

export function resolveMcpResourceUrl(): string {
  return process.env.MCP_RESOURCE_URL ?? ROAS_MCP_RESOURCE_URL
}
