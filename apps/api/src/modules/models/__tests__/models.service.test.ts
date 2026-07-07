import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ENABLED_LLM_MODEL_IDS,
  LLM_MODELS_SETTINGS_KEY,
} from '../model-workspace.constants'
import { ModelsRepository } from '../repositories/models.repository'
import { ModelsService } from '../services/models.service'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

function createConfig() {
  return {
    get: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
      return undefined
    }),
  } as unknown as ConfigService
}

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    update: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(resolve(result)),
  }
  return query
}

function createModelRows() {
  return [
    ...new Set([
      ...DEFAULT_ENABLED_LLM_MODEL_IDS,
      'anthropic/claude-haiku-4.5',
      'anthropic/claude-opus-4.6',
      'anthropic/claude-opus-4.7',
      'openai/gpt-5.3-codex',
    ]),
  ].map((id, index) => {
      const [provider, model_name] = id.split('/')
      return {
        provider,
        model_name,
        display_name: `Model ${index}`,
        context_window_tokens: 128000,
        max_output_tokens: 4096,
        input_modalities: ['text'],
        output_modalities: ['text'],
        supported_parameters: [],
        supports_images: false,
        capability_profile: null,
      }
    })
}

function createModelQueries() {
  return [
    createQuery({ data: createModelRows(), error: null }),
    createQuery({ data: [], error: null }),
    createQuery({ data: [], error: null }),
  ] as const
}

describe('ModelsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses stored organization model preferences when listing models', async () => {
    const enabledId = DEFAULT_ENABLED_LLM_MODEL_IDS[0]
    const orgQuery = createQuery({
      data: { settings: { [LLM_MODELS_SETTINGS_KEY]: { enabled_model_ids: [enabledId] } } },
      error: null,
    })
    const [modelsQuery, pricingQuery, tiersQuery] = createModelQueries()
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(modelsQuery)
        .mockReturnValueOnce(pricingQuery)
        .mockReturnValueOnce(tiersQuery)
        .mockReturnValueOnce(orgQuery),
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new ModelsService(new ModelsRepository(config))

    await expect(service.listLlmModels({ orgId: 'org-1' })).resolves.toEqual([
      expect.objectContaining({ id: enabledId }),
    ])
  })

  it('adds connected subscription models for platform admins', async () => {
    const orgQuery = createQuery({ data: { settings: {} }, error: null })
    const profileQuery = createQuery({ data: { role: 'superadmin' }, error: null })
    const integrationQuery = createQuery({
      data: { status: 'connected', metadata: { vault_secret_label: 'oauth:default' } },
      error: null,
    })
    const vaultQuery = createQuery({ data: { id: 'secret-1' }, error: null })
    const anthropicIntegrationQuery = createQuery({ data: null, error: null })
    const [modelsQuery, pricingQuery, tiersQuery] = createModelQueries()
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(modelsQuery)
        .mockReturnValueOnce(pricingQuery)
        .mockReturnValueOnce(tiersQuery)
        .mockReturnValueOnce(orgQuery)
        .mockReturnValueOnce(profileQuery)
        .mockReturnValueOnce(integrationQuery)
        .mockReturnValueOnce(vaultQuery)
        .mockReturnValueOnce(anthropicIntegrationQuery),
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new ModelsService(new ModelsRepository(config))
    const models = await service.listLlmModels({ orgId: 'org-1', userId: 'user-1' })

    expect(models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'openai-codex/gpt-5.5',
          billingSource: 'subscription',
          pricing: {},
        }),
        expect.objectContaining({
          id: 'openai-codex/gpt-5.5-codex',
          label: 'OpenAI Subscription GPT-5.5 Codex',
        }),
        expect.objectContaining({ id: 'openai-codex/gpt-5.3-codex' }),
      ]),
    )
    expect(integrationQuery.is).toHaveBeenCalledWith('org_id', null)
    expect(vaultQuery.eq).toHaveBeenCalledWith('provider', 'openai-codex')
  })

  it('adds connected Claude subscription models for platform admins', async () => {
    const orgQuery = createQuery({ data: { settings: {} }, error: null })
    const profileQuery = createQuery({ data: { role: 'superadmin' }, error: null })
    const openAIIntegrationQuery = createQuery({ data: null, error: null })
    const anthropicIntegrationQuery = createQuery({
      data: { status: 'connected', metadata: { vault_secret_label: 'setup-token:default' } },
      error: null,
    })
    const vaultQuery = createQuery({ data: { id: 'secret-1' }, error: null })
    const [modelsQuery, pricingQuery, tiersQuery] = createModelQueries()
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(modelsQuery)
        .mockReturnValueOnce(pricingQuery)
        .mockReturnValueOnce(tiersQuery)
        .mockReturnValueOnce(orgQuery)
        .mockReturnValueOnce(profileQuery)
        .mockReturnValueOnce(openAIIntegrationQuery)
        .mockReturnValueOnce(anthropicIntegrationQuery)
        .mockReturnValueOnce(vaultQuery),
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new ModelsService(new ModelsRepository(config))
    const models = await service.listLlmModels({ orgId: 'org-1', userId: 'user-1' })

    expect(models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'anthropic-subscription/claude-opus-4-6',
          provider: 'anthropic-subscription',
          billingSource: 'subscription',
          pricing: {},
        }),
        expect.objectContaining({
          id: 'anthropic-subscription/claude-opus-4-8',
          label: 'Claude Subscription Opus 4.8',
        }),
        expect.objectContaining({ id: 'anthropic-subscription/claude-haiku-4-5' }),
      ]),
    )
    expect(anthropicIntegrationQuery.is).toHaveBeenCalledWith('org_id', null)
    expect(vaultQuery.eq).toHaveBeenCalledWith('provider', 'anthropic')
  })

  it('does not add subscription models for non-admin users', async () => {
    const orgQuery = createQuery({ data: { settings: {} }, error: null })
    const profileQuery = createQuery({ data: { role: 'user' }, error: null })
    const [modelsQuery, pricingQuery, tiersQuery] = createModelQueries()
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(modelsQuery)
        .mockReturnValueOnce(pricingQuery)
        .mockReturnValueOnce(tiersQuery)
        .mockReturnValueOnce(orgQuery)
        .mockReturnValueOnce(profileQuery),
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new ModelsService(new ModelsRepository(config))
    const models = await service.listLlmModels({ orgId: 'org-1', userId: 'user-1' })

    expect(models.some((model) => model.id.startsWith('openai-codex/'))).toBe(false)
  })

  it('preserves other organization settings when updating enabled model ids', async () => {
    const enabledId = DEFAULT_ENABLED_LLM_MODEL_IDS[0]
    const readOrgQuery = createQuery({
      data: { settings: { theme: 'dark', [LLM_MODELS_SETTINGS_KEY]: { enabled_model_ids: [] } } },
      error: null,
    })
    const updateOrgQuery = createQuery({ error: null })
    const [modelsQuery, pricingQuery, tiersQuery] = createModelQueries()
    const readPrefsQuery = createQuery({
      data: { settings: { [LLM_MODELS_SETTINGS_KEY]: { enabled_model_ids: [enabledId] } } },
      error: null,
    })
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(readOrgQuery)
        .mockReturnValueOnce(updateOrgQuery)
        .mockReturnValueOnce(modelsQuery)
        .mockReturnValueOnce(pricingQuery)
        .mockReturnValueOnce(tiersQuery)
        .mockReturnValueOnce(readPrefsQuery),
    }
    vi.mocked(createClient).mockReturnValue(supabase as never)

    const config = createConfig()
    const service = new ModelsService(new ModelsRepository(config))

    await service.updateWorkspaceModelPreferences('org-1', [enabledId])

    expect(updateOrgQuery.update).toHaveBeenCalledWith({
      settings: {
        theme: 'dark',
        [LLM_MODELS_SETTINGS_KEY]: {
          enabled_model_ids: [enabledId],
        },
      },
    })
  })
})
