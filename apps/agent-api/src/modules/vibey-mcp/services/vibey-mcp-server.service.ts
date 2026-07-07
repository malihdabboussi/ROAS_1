import { Injectable } from '@nestjs/common'
import { ArtifactsService } from '../../artifacts/services/artifacts.service'
import type { VibeyMcpTokenClaims } from '../types/vibey-mcp.types'
import { VibeyMcpInstructionsService } from './vibey-mcp-instructions.service'
import { VibeyMcpPolicyService } from './vibey-mcp-policy.service'
import { VibeyMcpPromptCatalogService } from './vibey-mcp-prompt-catalog.service'
import { VibeyMcpResourceCatalogService } from './vibey-mcp-resource-catalog.service'
import { VibeyMcpSessionService } from './vibey-mcp-session.service'
import { VibeyMcpToolCatalogService } from './vibey-mcp-tool-catalog.service'

interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

@Injectable()
export class VibeyMcpServerService {
  constructor(
    private readonly artifacts: ArtifactsService,
    private readonly catalog: VibeyMcpToolCatalogService,
    private readonly instructions: VibeyMcpInstructionsService,
    private readonly policy: VibeyMcpPolicyService,
    private readonly prompts: VibeyMcpPromptCatalogService,
    private readonly resources: VibeyMcpResourceCatalogService,
    private readonly sessions: VibeyMcpSessionService,
  ) {}

  async handleRpc(body: JsonRpcRequest, claims: VibeyMcpTokenClaims) {
    if (body.method === 'initialize') {
      return this.result(body.id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {}, prompts: {}, resources: {} },
        serverInfo: { name: 'vibey', version: '1.0.0' },
        instructions: this.instructions.buildInstructions(),
      })
    }
    if (body.method === 'notifications/initialized') return null
    if (body.method === 'tools/list') {
      return this.result(body.id, { tools: this.catalog.listTools() })
    }
    if (body.method === 'prompts/list') {
      return this.result(body.id, { prompts: this.prompts.listPrompts() })
    }
    if (body.method === 'prompts/get') {
      const name = String(body.params?.name ?? '')
      const prompt = this.prompts.getPrompt(name)
      if (!prompt) return this.error(body.id, -32602, `Unknown MCP prompt: ${name || 'unknown'}`)
      return this.result(body.id, {
        description: prompt.description,
        messages: prompt.messages,
      })
    }
    if (body.method === 'resources/list') {
      return this.result(body.id, { resources: this.resources.listResources() })
    }
    if (body.method === 'resources/read') {
      const uri = String(body.params?.uri ?? '')
      const resource = this.resources.getResource(uri)
      if (!resource) return this.error(body.id, -32602, `Unknown MCP resource: ${uri || 'unknown'}`)
      return this.result(body.id, {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      })
    }
    if (body.method === 'tools/call') {
      const name = String(body.params?.name ?? '')
      const args =
        body.params?.arguments && typeof body.params.arguments === 'object'
          ? (body.params.arguments as Record<string, unknown>)
          : {}
      const tool = this.policy.assertAllowed({ toolName: name, args, claims })
      const sessionKey = await this.sessions.buildSessionKey(claims, args)
      const result = await this.artifacts.executeAction(tool.action, args, sessionKey)
      const maybeRecord =
        result && typeof result === 'object' ? (result as Record<string, unknown>) : null
      if (maybeRecord?.success === false) {
        return this.error(body.id, -32000, String(maybeRecord.error ?? 'MCP tool failed'))
      }
      return this.result(body.id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: this.toStructuredContent(result),
      })
    }
    return this.error(body.id, -32601, `Unknown MCP method: ${body.method ?? 'unknown'}`)
  }

  private result(id: JsonRpcRequest['id'], result: unknown) {
    return { jsonrpc: '2.0', id: id ?? null, result }
  }

  private error(id: JsonRpcRequest['id'], code: number, message: string) {
    return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
  }

  /** MCP structuredContent must be a JSON object; wrap bare arrays and primitives. */
  private toStructuredContent(result: unknown): Record<string, unknown> {
    if (Array.isArray(result)) return { items: result }
    if (result && typeof result === 'object') return result as Record<string, unknown>
    return { value: result }
  }
}
