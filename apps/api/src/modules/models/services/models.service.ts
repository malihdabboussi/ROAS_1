import { Injectable } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import {
  DEFAULT_ENABLED_LLM_MODEL_IDS,
  LLM_MODELS_SETTINGS_KEY,
  type LlmModelsOrgSettings,
} from '../model-workspace.constants'
import { PLATFORM_ADMIN_ROLES, SUBSCRIPTION_MODEL_CATALOG } from '../model-subscription-catalog'
import {
  isConnectedIntegration,
  readVaultLabel,
  toSubscriptionModel,
} from '../model-subscription-helpers'
import { ModelsRepository } from '../repositories/models.repository'

export interface LlmModel {
  id: string
  provider: string
  modelName: string
  label: string
  billingSource?: 'vibey' | 'subscription'
  subscriptionProvider?: string
  subscriptionIntegrationId?: string
  contextWindow: number
  maxOutputTokens: number | null
  supportsImages: boolean
  inputModalities: string[]
  outputModalities: string[]
  supportedParameters: string[]
  capabilityProfile: ModelCapabilityProfile
  contextOptions: ModelContextOption[]
  reasoningLevels: string[]
  speedModes: Array<'standard' | 'fast'>
  pricing: Record<string, number>
  pricingTiers: ModelPricingTier[]
}

export interface ModelStrategyOption {
  id: 'auto:economy' | 'auto' | 'auto:power'
  label: 'Economy' | 'Auto' | 'Power'
}

export interface WorkspaceLlmModel extends LlmModel {
  enabled: boolean
  isDefault: boolean
}

export interface WorkspaceLlmModelPreferences {
  enabled_model_ids: string[]
  models: WorkspaceLlmModel[]
}

const CACHE_CERTIFIED_MODELS = new Set<string>([
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.7',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-sonnet-4.6',
  'deepseek/deepseek-v4-flash',
  'google/gemini-3.5-flash',
  'google/gemini-3.1-pro-preview',
  'minimax/minimax-m2.5',
  'openai/gpt-5.3-codex',
  'openai/gpt-5.4',
  'openai/gpt-5.4-pro',
  'openai/gpt-5.5',
])

export interface ModelContextOption {
  tokens: number
  label: string
  pricingProfile?: string
}

export interface ModelPricingTier {
  pricingProfile: string
  thresholdMinTokens: number
  thresholdMaxTokens: number | null
  inputTokens1k: number | null
  outputTokens1k: number | null
  cacheRead1k: number | null
  cacheWrite1k: number | null
  currency: string
  source: string
}

export interface ModelCapabilityProfile {
  reasoning?: {
    transport?: 'none' | 'reasoning.effort' | 'reasoning.max_tokens' | 'verbosity'
    levels?: string[]
  }
  context?: {
    tiers?: ModelContextOption[]
  }
  speed?: {
    available?: boolean
    fastModelId?: string
    variantOf?: string
  }
  [key: string]: unknown
}

interface CapabilityRow {
  provider: string
  model_name: string
  display_name: string
  context_window_tokens: number
  max_output_tokens: number | null
  input_modalities: string[] | null
  output_modalities: string[] | null
  supported_parameters: string[] | null
  supports_images: boolean | null
  capability_profile: ModelCapabilityProfile | null
}

interface PricingRow {
  provider: string
  model_name: string
  unit_type: string
  cost_per_unit: number | string
}

interface PricingTierRow {
  provider: string
  model_name: string
  pricing_profile: string
  token_threshold_min: number
  token_threshold_max: number | null
  input_tokens_1k: number | string | null
  output_tokens_1k: number | string | null
  cache_read_1k: number | string | null
  cache_write_1k: number | string | null
  currency: string
  source: string
}

interface OpenRouterModel {
  id: string
  name?: string
  context_length?: number
  architecture?: {
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
  }
  top_provider?: {
    context_length?: number | null
    max_completion_tokens?: number | null
  }
  supported_parameters?: string[]
  pricing?: Record<string, string>
  canonical_slug?: string
}

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

function resolveOpenRouterModalities(
  openRouterModel: OpenRouterModel | undefined,
  fallbackInput: string[] | null | undefined,
  fallbackOutput: string[] | null | undefined,
): { inputModalities: string[]; outputModalities: string[]; supportsImages: boolean } {
  const inputModalities =
    openRouterModel?.architecture?.input_modalities ??
    (fallbackInput?.length ? fallbackInput : ['text'])
  const outputModalities =
    openRouterModel?.architecture?.output_modalities ??
    (fallbackOutput?.length ? fallbackOutput : ['text'])
  return {
    inputModalities,
    outputModalities,
    supportsImages: inputModalities.includes('image'),
  }
}

@Injectable()
export class ModelsService {
  constructor(private readonly modelsRepository: ModelsRepository) {}

  async listLlmModels(scope?: Pick<RequestScope, 'orgId'> & Partial<Pick<RequestScope, 'userId'>>) {
    const all = await this.fetchCertifiedLlmModels()
    const enabledIds = await this.resolveEnabledModelIds(scope?.orgId ?? null)
    const standardModels = all.filter((model) => enabledIds.has(model.id))
    const subscriptionModels = await this.fetchSubscriptionLlmModels(scope?.userId, all)
    if (subscriptionModels.length === 0) return standardModels
    const seen = new Set(standardModels.map((model) => model.id))
    return [...standardModels, ...subscriptionModels.filter((model) => !seen.has(model.id))]
  }

  async getWorkspaceModelPreferences(
    scope: Pick<RequestScope, 'orgId'>,
  ): Promise<WorkspaceLlmModelPreferences> {
    const all = await this.fetchCertifiedLlmModels()
    const enabledIds = await this.resolveEnabledModelIds(scope.orgId ?? null)
    const defaultSet = new Set<string>(DEFAULT_ENABLED_LLM_MODEL_IDS)
    return {
      enabled_model_ids: [...enabledIds],
      models: all.map((model) => ({
        ...model,
        enabled: enabledIds.has(model.id),
        isDefault: defaultSet.has(model.id),
      })),
    }
  }

  async updateWorkspaceModelPreferences(
    orgId: string,
    enabledModelIds: string[],
  ): Promise<WorkspaceLlmModelPreferences> {
    const normalized = [
      ...new Set(
        enabledModelIds.filter((id) => typeof id === 'string' && CACHE_CERTIFIED_MODELS.has(id)),
      ),
    ]
    if (normalized.length === 0) {
      throw new Error('At least one model must remain enabled')
    }

    const { data: org, error: readError } =
      await this.modelsRepository.readOrganizationSettings(orgId)

    if (readError) {
      throw new Error(`Failed to read organization settings: ${readError.message}`)
    }
    if (!org) {
      throw new Error('Organization not found')
    }

    const settings =
      org.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
        ? (org.settings as Record<string, unknown>)
        : {}
    const llmSettings =
      settings[LLM_MODELS_SETTINGS_KEY] &&
      typeof settings[LLM_MODELS_SETTINGS_KEY] === 'object' &&
      !Array.isArray(settings[LLM_MODELS_SETTINGS_KEY])
        ? (settings[LLM_MODELS_SETTINGS_KEY] as LlmModelsOrgSettings)
        : {}

    const nextSettings = {
      ...settings,
      [LLM_MODELS_SETTINGS_KEY]: {
        ...llmSettings,
        enabled_model_ids: normalized,
      },
    }

    const { error: updateError } = await this.modelsRepository.updateOrganizationSettings(
      orgId,
      nextSettings,
    )

    if (updateError) {
      throw new Error(`Failed to update organization model settings: ${updateError.message}`)
    }

    return this.getWorkspaceModelPreferences({ orgId })
  }

  private async resolveEnabledModelIds(orgId: string | null): Promise<Set<string>> {
    const stored = orgId ? await this.readStoredEnabledModelIds(orgId) : null
    const ids = stored ?? [...DEFAULT_ENABLED_LLM_MODEL_IDS]
    return new Set(ids.filter((id) => CACHE_CERTIFIED_MODELS.has(id)))
  }

  private async readStoredEnabledModelIds(orgId: string): Promise<string[] | null> {
    const { data, error } = await this.modelsRepository.readOrganizationSettings(orgId)

    if (error) {
      throw new Error(`Failed to read organization settings: ${error.message}`)
    }

    const settings = data?.settings
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null

    const llmSettings = (settings as Record<string, unknown>)[LLM_MODELS_SETTINGS_KEY]
    if (!llmSettings || typeof llmSettings !== 'object' || Array.isArray(llmSettings)) return null

    const enabled = (llmSettings as LlmModelsOrgSettings).enabled_model_ids
    if (!Array.isArray(enabled)) return null

    const normalized = enabled.filter(
      (id): id is string => typeof id === 'string' && CACHE_CERTIFIED_MODELS.has(id),
    )
    return normalized.length > 0 ? normalized : null
  }

  private async fetchSubscriptionLlmModels(
    userId: string | undefined,
    baseModels: LlmModel[],
  ): Promise<LlmModel[]> {
    if (!userId) return []

    const { data: profile, error: profileError } =
      await this.modelsRepository.readUserPlatformRole(userId)
    const role = String((profile as { role?: unknown } | null)?.role ?? '')
    if (profileError || !PLATFORM_ADMIN_ROLES.has(role)) return []

    const baseById = new Map(baseModels.map((model) => [model.id, model]))
    const subscriptionModels: LlmModel[] = []
    for (const source of SUBSCRIPTION_MODEL_CATALOG) {
      const { data: integration, error: integrationError } =
        await this.modelsRepository.readPersonalIntegration(userId, source.integrationId)
      if (integrationError || !isConnectedIntegration(integration)) continue

      const vaultLabel = readVaultLabel(integration.metadata, source.vaultLabel)
      const credentialProvider = source.credentialProvider ?? source.provider
      const { data: secret, error: secretError } = await this.modelsRepository.readVaultSecret(
        userId,
        credentialProvider,
        vaultLabel,
      )
      if (secretError || !secret) continue

      for (const model of source.models) {
        const base = baseById.get(model.baseModelId) ?? baseById.get(source.fallbackBaseModelId)
        if (base) subscriptionModels.push(toSubscriptionModel(base, source, model))
      }
    }
    return subscriptionModels
  }

  private async fetchCertifiedLlmModels(): Promise<LlmModel[]> {
    const { data, error } = await this.modelsRepository.listSelectableModelCapabilities()

    if (error) {
      throw new Error(`Failed to fetch models: ${error.message}`)
    }

    const rows = (data ?? []) as CapabilityRow[]
    const modelIds = rows.map((row) => `${row.provider}/${row.model_name}`)
    const pricing = await this.fetchPricing(modelIds)
    const pricingTiers = await this.fetchPricingTiers(modelIds)

    return rows
      .filter((row) => CACHE_CERTIFIED_MODELS.has(`${row.provider}/${row.model_name}`))
      .map((row) => {
        const id = `${row.provider}/${row.model_name}`
        const capabilityProfile = normalizeCapabilityProfile(row.capability_profile)
        const contextOptions = normalizeContextOptions(capabilityProfile, row.context_window_tokens)
        const reasoningLevels = capabilityProfile.reasoning?.levels ?? ['none']
        const speedModes: Array<'standard' | 'fast'> = ['standard']
        if (capabilityProfile.speed?.available === true && capabilityProfile.speed.fastModelId) {
          speedModes.push('fast')
        }
        return {
          id,
          provider: row.provider,
          modelName: row.model_name,
          label: normalizeModelDisplayLabel(
            row.provider,
            row.display_name || formatModelLabel(row.provider, row.model_name),
          ),
          contextWindow: row.context_window_tokens,
          maxOutputTokens: row.max_output_tokens,
          supportsImages: row.supports_images === true,
          inputModalities: row.input_modalities ?? ['text'],
          outputModalities: row.output_modalities ?? ['text'],
          supportedParameters: row.supported_parameters ?? [],
          capabilityProfile,
          contextOptions,
          reasoningLevels,
          speedModes,
          pricing: pricing.get(id) ?? {},
          pricingTiers: pricingTiers.get(id) ?? [],
        }
      })
  }

  listModelStrategies(): ModelStrategyOption[] {
    return [
      { id: 'auto:economy', label: 'Economy' },
      { id: 'auto', label: 'Auto' },
      { id: 'auto:power', label: 'Power' },
    ]
  }

  async syncOpenRouterModelCapabilities(): Promise<{ checked: number; updated: number }> {
    const res = await fetch(OPENROUTER_MODELS_URL)
    if (!res.ok) {
      throw new Error(`OpenRouter models sync failed: ${res.status} ${res.statusText}`)
    }
    const json = (await res.json()) as { data?: OpenRouterModel[] }
    const byId = new Map((json.data ?? []).map((model) => [model.id, model]))

    const { data, error } = await this.modelsRepository.listActiveModelCapabilitiesForSync()

    if (error) {
      throw new Error(`Failed to fetch capability catalog: ${error.message}`)
    }

    let updated = 0
    for (const row of (data ?? []) as Array<{
      provider: string
      model_name: string
      capability_profile: ModelCapabilityProfile | null
    }>) {
      const id = `${row.provider}/${row.model_name}`
      const model = byId.get(id)
      if (!model) continue
      const { inputModalities, outputModalities, supportsImages } = resolveOpenRouterModalities(
        model,
        ['text'],
        ['text'],
      )
      const { error: updateError } = await this.modelsRepository.updateOpenRouterCapability(
        row.provider,
        row.model_name,
        {
          display_name: normalizeModelDisplayLabel(
            row.provider,
            stripOpenRouterProviderPrefix(model.name) ??
              formatModelLabel(row.provider, row.model_name),
          ),
          context_window_tokens:
            model.context_length ?? model.top_provider?.context_length ?? undefined,
          max_output_tokens: model.top_provider?.max_completion_tokens ?? undefined,
          input_modalities: inputModalities,
          output_modalities: outputModalities,
          supported_parameters: model.supported_parameters ?? [],
          supports_images: supportsImages,
          raw_openrouter: model,
          synced_at: new Date().toISOString(),
        },
      )
      if (updateError) {
        throw new Error(`Failed to update ${id}: ${updateError.message}`)
      }
      updated++
    }

    return { checked: (data ?? []).length, updated }
  }

  private async fetchPricing(modelIds: string[]): Promise<Map<string, Record<string, number>>> {
    if (modelIds.length === 0) return new Map()
    const { data, error } = await this.modelsRepository.listActiveLlmPricing()

    if (error) {
      throw new Error(`Failed to fetch model pricing: ${error.message}`)
    }

    const allowed = new Set(modelIds)
    const pricing = new Map<string, Record<string, number>>()
    for (const row of (data ?? []) as PricingRow[]) {
      const id = `${row.provider}/${row.model_name}`
      if (!allowed.has(id)) continue
      const bucket = pricing.get(id) ?? {}
      bucket[row.unit_type] = Number(row.cost_per_unit)
      pricing.set(id, bucket)
    }
    return pricing
  }

  private async fetchPricingTiers(modelIds: string[]): Promise<Map<string, ModelPricingTier[]>> {
    if (modelIds.length === 0) return new Map()
    const { data, error } = await this.modelsRepository.listActiveModelPricingTiers()

    if (error) {
      throw new Error(`Failed to fetch model pricing tiers: ${error.message}`)
    }

    const allowed = new Set(modelIds)
    const pricing = new Map<string, ModelPricingTier[]>()
    for (const row of (data ?? []) as PricingTierRow[]) {
      const id = `${row.provider}/${row.model_name}`
      if (!allowed.has(id)) continue
      const bucket = pricing.get(id) ?? []
      bucket.push({
        pricingProfile: row.pricing_profile,
        thresholdMinTokens: Number(row.token_threshold_min),
        thresholdMaxTokens:
          row.token_threshold_max == null ? null : Number(row.token_threshold_max),
        inputTokens1k: nullableNumber(row.input_tokens_1k),
        outputTokens1k: nullableNumber(row.output_tokens_1k),
        cacheRead1k: nullableNumber(row.cache_read_1k),
        cacheWrite1k: nullableNumber(row.cache_write_1k),
        currency: row.currency,
        source: row.source,
      })
      pricing.set(id, bucket)
    }
    return pricing
  }
}

function nullableNumber(value: number | string | null): number | null {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeCapabilityProfile(value: ModelCapabilityProfile | null): ModelCapabilityProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

function normalizeContextOptions(
  profile: ModelCapabilityProfile,
  fallbackContextWindow: number,
): ModelContextOption[] {
  const tiers = Array.isArray(profile.context?.tiers) ? profile.context.tiers : []
  const normalized = tiers
    .map((tier) => ({
      tokens: Number(tier.tokens),
      label: String(tier.label || formatContextLabel(Number(tier.tokens))),
      ...(tier.pricingProfile ? { pricingProfile: String(tier.pricingProfile) } : {}),
    }))
    .filter((tier) => Number.isFinite(tier.tokens) && tier.tokens > 0)
  if (normalized.length > 0) return normalized
  return [{ tokens: fallbackContextWindow, label: formatContextLabel(fallbackContextWindow) }]
}

function formatContextLabel(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 1_000_000)}M`
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`
  return String(tokens)
}

function stripOpenRouterProviderPrefix(name: string | undefined): string | null {
  if (!name?.trim()) return null
  return name.replace(/^[^:]+:\s*/, '').trim()
}

function normalizeModelDisplayLabel(provider: string, label: string): string {
  let normalized = label.replace(/\s+Preview$/i, '').trim()
  if (provider.toLowerCase() === 'anthropic') {
    normalized = normalized.replace(/^Claude\s+/i, '').trim()
  }
  return normalized
}

function formatModelLabel(provider: string, modelName: string): string {
  const providerLabels: Record<string, string> = {
    'z-ai': 'Z-AI',
    anthropic: 'Anthropic',
    deepseek: 'DeepSeek',
    google: 'Google',
    minimax: 'Minimax',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
  }
  let name = modelName
    .replace(/^claude-/, '')
    .replace(/^gpt-/, 'GPT-')
    .replace(/^gemini-/, '')
    .replace(/^minimax-/, '')
    .replace(/-(\d)-(\d)$/, ' $1.$2')
    .replace(/-/g, ' ')
  name = name.replace(/\b\w/g, (c) => c.toUpperCase())
  name = name.replace(/\bGpt\b/gi, 'GPT').replace(/\bGlm\b/gi, 'GLM')

  if (provider.toLowerCase() === 'anthropic') {
    return name.trim()
  }

  const providerLabel =
    providerLabels[provider.toLowerCase()] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
  return `${providerLabel} ${name}`.trim()
}
