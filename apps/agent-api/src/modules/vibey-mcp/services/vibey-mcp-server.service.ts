import { Injectable } from '@nestjs/common'
import { buildErrorEnvelope } from '../../artifacts/services/artifact-error-classifier'
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
      try {
        const tool = this.policy.assertAllowed({ toolName: name, args, claims })
        const sessionKey = await this.sessions.buildSessionKey(claims, args)
        const result = await this.artifacts.executeAction(tool.action, args, sessionKey)
        const maybeRecord =
          result && typeof result === 'object' ? (result as Record<string, unknown>) : null
        if (maybeRecord?.success === false) {
          return this.toolError(body.id, this.completeToolFailure(maybeRecord, tool.action))
        }
        return this.result(body.id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: this.toStructuredContent(result),
        })
      } catch (error) {
        return this.toolError(
          body.id,
          buildErrorEnvelope(error, { workflowClass: name || 'unknown_mcp_tool' }),
        )
      }
    }
    return this.error(body.id, -32601, `Unknown MCP method: ${body.method ?? 'unknown'}`)
  }

  private result(id: JsonRpcRequest['id'], result: unknown) {
    return { jsonrpc: '2.0', id: id ?? null, result }
  }

  private error(id: JsonRpcRequest['id'], code: number, message: string) {
    return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
  }

  private completeToolFailure(
    failure: Record<string, unknown>,
    workflowClass: string,
  ): Record<string, unknown> {
    if (
      typeof failure.error_code === 'string' &&
      typeof failure.error_class === 'string' &&
      typeof failure.effect_state === 'string' &&
      typeof failure.retry_policy === 'object' &&
      typeof failure.correction === 'object' &&
      typeof failure.agent_instruction === 'string' &&
      typeof failure.user_explanation === 'object' &&
      Array.isArray(failure.forbidden_user_framing) &&
      typeof failure.observability === 'object'
    ) {
      return {
        ...failure,
        workflow_class:
          typeof failure.workflow_class === 'string' ? failure.workflow_class : workflowClass,
      }
    }
    return {
      ...failure,
      ...buildErrorEnvelope(failure.error ?? 'MCP tool failed', { workflowClass }),
    }
  }

  private toolError(id: JsonRpcRequest['id'], failure: object) {
    const failureRecord = { ...failure } as Record<string, unknown>
    const userExplanation =
      failureRecord.user_explanation && typeof failureRecord.user_explanation === 'object'
        ? (failureRecord.user_explanation as Record<string, unknown>)
        : null
    const userFacingText =
      typeof userExplanation?.sentence === 'string'
        ? userExplanation.sentence
        : String(failureRecord.error ?? 'The MCP tool could not complete this request.')
    const modelVisibleFailure = {
      success: failureRecord.success,
      error_code: failureRecord.error_code,
      error_class: failureRecord.error_class,
      workflow_class: failureRecord.workflow_class,
      effect_state: failureRecord.effect_state,
      retry_policy: failureRecord.retry_policy,
      correction: failureRecord.correction,
      agent_instruction: failureRecord.agent_instruction,
      user_explanation: failureRecord.user_explanation,
      forbidden_user_framing: failureRecord.forbidden_user_framing,
      observability: failureRecord.observability,
    }
    const text = `${userFacingText}\n\nStructured MCP error:\n${JSON.stringify(modelVisibleFailure, null, 2)}`
    return this.result(id, {
      content: [{ type: 'text', text }],
      structuredContent: failureRecord,
      isError: true,
    })
  }

  /** MCP structuredContent must be a JSON object; wrap bare arrays and primitives. */
  private toStructuredContent(result: unknown): Record<string, unknown> {
    if (Array.isArray(result)) return { items: result }
    if (result && typeof result === 'object') return result as Record<string, unknown>
    return { value: result }
  }
}
