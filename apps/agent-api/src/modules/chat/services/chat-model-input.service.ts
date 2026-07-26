import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { DocumentIntelligenceMetadata } from '@vibey/api-shared'
import { AgentRuntimeSkillScopeService } from '../../agent-sync/services/agent-runtime-skill-scope.service'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import type {
  ModelReasoningEffort,
  ModelReasoningTransport,
  OpenClawInputContentPart,
  OpenClawModelSettings,
  OpenClawSkillCatalog,
} from './openclaw-proxy.service'

export interface ChatModelSettings {
  reasoning_effort?: ModelReasoningEffort
  context_window_tokens?: number
  speed_mode?: 'standard' | 'fast'
  cortex_max?: boolean
}

export interface ModelCapabilityProfile {
  reasoning?: {
    transport?: ModelReasoningTransport
    levels?: string[]
  }
  context?: {
    tiers?: Array<{ tokens?: number; label?: string; pricingProfile?: string }>
  }
  speed?: {
    available?: boolean
    fastModelId?: string
  }
}

export interface ValidatedModelSettings {
  requestedModelId: string
  resolvedModelId: string
  request: ChatModelSettings
  openClaw: OpenClawModelSettings
}

export interface ResolvedChatModelSelection {
  modelId: string
  reason: string
  modelSettings?: ChatModelSettings
}

interface ChatModelDocumentAttachment {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  dataUrl?: string
  fileUrl?: string
  mimeType?: string
  sizeBytes?: number
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

const CHAT_IMAGE_MAX_BYTES = 15 * 1024 * 1024
const CHAT_INPUT_FILE_MAX_BYTES = 5 * 1024 * 1024
const CHAT_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const IMAGE_CAPABLE_CHAT_MODELS = new Set([
  'anthropic/claude-fable-5',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.7',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-opus-5',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-sonnet-5',
  'google/gemini-3.5-flash',
  'google/gemini-3.1-pro-preview',
  'openai/gpt-5.3-codex',
  'openai/gpt-5.4',
  'openai/gpt-5.4-pro',
  'openai/gpt-5.5',
  'openai/gpt-5.6-sol',
  'openai/gpt-5.6-terra',
])

const PAUSED_MODEL_REDIRECTS = new Map<string, string>([['anthropic/claude-fable-5', 'auto:power']])
const SUBSCRIPTION_MODEL_CAPABILITY_IDS = new Map<string, string>([
  ['openai-codex/gpt-5.5', 'openai/gpt-5.5'],
  ['openai-codex/gpt-5.5-codex', 'openai/gpt-5.5'],
  ['openai-codex/gpt-5.3-codex', 'openai/gpt-5.3-codex'],
  ['anthropic-subscription/claude-opus-4-6', 'anthropic/claude-opus-4.6'],
  ['anthropic-subscription/claude-opus-4-7', 'anthropic/claude-opus-4.7'],
  ['anthropic-subscription/claude-opus-4-8', 'anthropic/claude-opus-4.8'],
  ['anthropic-subscription/claude-sonnet-4-6', 'anthropic/claude-sonnet-4.6'],
  ['anthropic-subscription/claude-haiku-4-5', 'anthropic/claude-haiku-4.5'],
])

function normalizeContentType(value: string | null | undefined): string | null {
  if (!value) return null
  const mime = value.split(';')[0]?.trim().toLowerCase()
  return mime || null
}

function normalizeGatewayModelId(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/^openrouter\//, '')
    .replace(/^openclaw:/, '')
    .trim()
}

function resolveModelCapabilityId(value: string | null | undefined): string {
  const normalized = normalizeGatewayModelId(value)
  return SUBSCRIPTION_MODEL_CAPABILITY_IDS.get(normalized.toLowerCase()) ?? normalized
}

function parseImageDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(value.trim())
  if (!match?.[1] || !match?.[2]) return null
  return {
    mimeType: normalizeContentType(match[1]) ?? '',
    data: match[2].trim(),
  }
}

@Injectable()
export class ChatModelInputService {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly runtimeSkillScope: AgentRuntimeSkillScopeService,
    private readonly chatContextRepository: ChatContextRepository,
  ) {}

  normalizeModelValue(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (trimmed.length === 0) return null
    return PAUSED_MODEL_REDIRECTS.get(normalizeGatewayModelId(trimmed)) ?? trimmed
  }

  mergeResolvedModelSettings(
    selection: ResolvedChatModelSelection,
    settings?: ChatModelSettings,
  ): ChatModelSettings | undefined {
    if (!selection.modelSettings) return settings
    if (!settings) return selection.modelSettings
    return { ...selection.modelSettings, ...settings }
  }

  async resolveAgentConfiguredModel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const { data } = await this.chatContextRepository.findAgentConfiguredModelConfig(supabase, {
      userId,
      agentKey,
      orgId,
    })
    const cfg =
      data?.config && typeof data.config === 'object'
        ? (data.config as Record<string, unknown>)
        : {}
    return this.normalizeModelValue(typeof cfg.model_id === 'string' ? cfg.model_id : null)
  }

  resolveAgentArchetype(agentReg: Record<string, unknown> | null | undefined): string | null {
    const config =
      agentReg?.config && typeof agentReg.config === 'object'
        ? (agentReg.config as Record<string, unknown>)
        : null
    return typeof config?.archetype === 'string' && config.archetype.trim()
      ? config.archetype.trim()
      : null
  }

  async resolveOpenClawSkillCatalog(input: {
    agentKey: string
    userId: string
    orgId?: string | null
    agentReg?: Record<string, unknown> | null
  }): Promise<OpenClawSkillCatalog | undefined> {
    const catalog = await this.runtimeSkillScope.resolveRuntimeSkillCatalog({
      agentKey: input.agentKey,
      userId: input.userId,
      orgId: input.orgId ?? null,
      archetype: this.resolveAgentArchetype(input.agentReg),
    })
    return catalog.entries.length > 0 ? catalog : undefined
  }

  supportsImageInput(modelId: string): boolean {
    return IMAGE_CAPABLE_CHAT_MODELS.has(resolveModelCapabilityId(modelId))
  }

  assertImageInputSupported(modelId: string): void {
    if (this.supportsImageInput(modelId)) return
    throw new BadRequestException(
      'This model does not support images. Pick an image-capable model or remove the image.',
    )
  }

  parseCapabilityProfile(value: unknown): ModelCapabilityProfile {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as ModelCapabilityProfile
  }

  async loadModelCapability(modelId: string): Promise<{
    provider: string
    modelName: string
    profile: ModelCapabilityProfile
  } | null> {
    const normalized = resolveModelCapabilityId(modelId)
    const slash = normalized.indexOf('/')
    if (slash <= 0) return null
    const provider = normalized.slice(0, slash)
    const modelName = normalized.slice(slash + 1)
    const { data, error } = await this.chatContextRepository.findModelCapability(this.svc.client, {
      provider,
      modelName,
    })
    if (error) throw new Error(`Failed to read model capability: ${error.message}`)
    if (!data) return null
    return { provider, modelName, profile: this.parseCapabilityProfile(data.capability_profile) }
  }

  async validateModelSettings(
    modelId: string,
    settings?: ChatModelSettings,
  ): Promise<ValidatedModelSettings> {
    const requestedModelId = normalizeGatewayModelId(modelId)
    const capability = await this.loadModelCapability(requestedModelId)
    if (!capability) {
      if (settings && Object.keys(settings).length > 0) {
        throw new BadRequestException(`Model settings are not available for ${requestedModelId}`)
      }
      return { requestedModelId, resolvedModelId: requestedModelId, request: {}, openClaw: {} }
    }

    const request: ChatModelSettings = {}
    let resolvedModelId = requestedModelId
    const openClaw: OpenClawModelSettings = {}

    const speedMode = settings?.speed_mode ?? 'standard'
    if (speedMode === 'fast') {
      const fastModelId = capability.profile.speed?.fastModelId
      if (!fastModelId) {
        throw new BadRequestException(`${requestedModelId} does not support Fast mode`)
      }
      const fastCapability = await this.loadModelCapability(fastModelId)
      if (!fastCapability) {
        throw new BadRequestException(`${requestedModelId} Fast mode is not available`)
      }
      resolvedModelId = fastModelId
      request.speed_mode = 'fast'
    } else {
      request.speed_mode = 'standard'
    }

    const contextWindowTokens = settings?.context_window_tokens
    if (contextWindowTokens !== undefined) {
      const tiers = capability.profile.context?.tiers ?? []
      const allowed = tiers
        .map((tier) => Number(tier.tokens))
        .filter((tokens) => Number.isFinite(tokens) && tokens > 0)
      if (!allowed.includes(contextWindowTokens)) {
        throw new BadRequestException(`${requestedModelId} does not support that context window`)
      }
      request.context_window_tokens = contextWindowTokens
      openClaw.contextWindowTokens = contextWindowTokens
    }

    const reasoningEffort = settings?.reasoning_effort
    if (reasoningEffort !== undefined) {
      const levels = capability.profile.reasoning?.levels ?? ['none']
      if (!levels.includes(reasoningEffort)) {
        throw new BadRequestException(
          `${requestedModelId} does not support ${reasoningEffort} reasoning`,
        )
      }
      request.reasoning_effort = reasoningEffort
      if (reasoningEffort !== 'none') {
        openClaw.reasoningEffort = reasoningEffort
        openClaw.reasoningTransport = capability.profile.reasoning?.transport ?? 'none'
      }
    }

    if (typeof settings?.cortex_max === 'boolean') {
      request.cortex_max = settings.cortex_max
    }

    return { requestedModelId, resolvedModelId, request, openClaw }
  }

  assertChatImageMime(label: string, mimeType: string): void {
    if (CHAT_IMAGE_MIME_TYPES.has(mimeType)) return
    throw new BadRequestException(`Unsupported image type for ${label}: ${mimeType || 'unknown'}`)
  }

  loadChatImagePart(doc: ChatModelDocumentAttachment): OpenClawInputContentPart {
    const label = doc.filename || doc.fileUrl || 'image'
    if (doc.dataUrl) {
      const parsed = parseImageDataUrl(doc.dataUrl)
      if (!parsed) throw new BadRequestException(`Invalid image data for ${label}`)
      this.assertChatImageMime(label, parsed.mimeType)
      const sizeBytes = Buffer.byteLength(parsed.data, 'base64')
      if (sizeBytes <= 0 || sizeBytes > CHAT_IMAGE_MAX_BYTES) {
        throw new BadRequestException(`Image too large for ${label}`)
      }
      return {
        type: 'input_image',
        source: { type: 'base64', media_type: parsed.mimeType, data: parsed.data },
      }
    }

    if (!doc.fileUrl) throw new BadRequestException(`Missing image file URL for ${label}`)

    const mimeType = normalizeContentType(doc.mimeType)
    if (mimeType) this.assertChatImageMime(label, mimeType)

    return {
      type: 'input_image',
      source: { type: 'url', url: doc.fileUrl },
    }
  }

  buildChatImageParts(
    documents: ChatModelDocumentAttachment[] | undefined,
  ): OpenClawInputContentPart[] {
    const imageDocuments = (documents ?? []).filter(
      (doc) => doc.type === 'image' && (!!doc.fileUrl || !!doc.dataUrl),
    )
    if (imageDocuments.length === 0) return []

    return imageDocuments.map((doc) => this.loadChatImagePart(doc))
  }

  buildChatFileParts(
    documents: ChatModelDocumentAttachment[] | undefined,
  ): OpenClawInputContentPart[] {
    const fileDocuments = (documents ?? []).filter((doc) => {
      const intelligence = doc.documentIntelligence
      const mimeType = normalizeContentType(doc.mimeType)
      const sizeBytes = doc.sizeBytes ?? 0
      return (
        doc.type === 'text' &&
        intelligence?.status === 'ready' &&
        intelligence.strategy === 'native_file' &&
        mimeType === 'application/pdf' &&
        !!doc.fileUrl &&
        Number.isFinite(sizeBytes) &&
        sizeBytes > 0 &&
        sizeBytes <= CHAT_INPUT_FILE_MAX_BYTES
      )
    })

    return fileDocuments.map((doc) => ({
      type: 'input_file',
      source: {
        type: 'url',
        url: doc.fileUrl!,
        media_type: normalizeContentType(doc.mimeType) ?? 'application/pdf',
        filename: doc.filename,
      },
    }))
  }
}
