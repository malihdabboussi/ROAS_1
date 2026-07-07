import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ModelsRepository {
  private readonly supabase: SupabaseClient

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') || process.env.SUPABASE_URL || '',
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        '',
    )
  }

  async readOrganizationSettings(orgId: string) {
    return this.supabase.from('organizations').select('settings').eq('id', orgId).maybeSingle()
  }

  async updateOrganizationSettings(orgId: string, settings: Record<string, unknown>) {
    return this.supabase.from('organizations').update({ settings }).eq('id', orgId)
  }

  async readUserPlatformRole(userId: string) {
    return this.supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  }

  async readPersonalIntegration(userId: string, integrationId: string) {
    return this.supabase
      .from('user_integrations')
      .select('status, metadata')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .is('org_id', null)
      .maybeSingle()
  }

  async readVaultSecret(userId: string, provider: string, label: string) {
    return this.supabase
      .from('vault_secrets')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('label', label)
      .maybeSingle()
  }

  async listSelectableModelCapabilities() {
    return this.supabase
      .from('llm_model_capabilities')
      .select(
        'provider, model_name, display_name, context_window_tokens, max_output_tokens, input_modalities, output_modalities, supported_parameters, supports_images, capability_profile',
      )
      .eq('is_active', true)
      .eq('is_selectable', true)
      .order('provider')
      .order('model_name', { ascending: false })
  }

  async listActiveModelCapabilitiesForSync() {
    return this.supabase
      .from('llm_model_capabilities')
      .select('provider, model_name, capability_profile')
      .eq('is_active', true)
  }

  async updateOpenRouterCapability(
    provider: string,
    modelName: string,
    payload: Record<string, unknown>,
  ) {
    return this.supabase
      .from('llm_model_capabilities')
      .update(payload)
      .eq('provider', provider)
      .eq('model_name', modelName)
  }

  async listActiveLlmPricing() {
    return this.supabase
      .from('token_providers_pricing')
      .select('provider, model_name, unit_type, cost_per_unit')
      .eq('service_type', 'llm')
      .eq('is_active', true)
  }

  async listActiveModelPricingTiers() {
    return this.supabase
      .from('llm_model_pricing_tiers')
      .select(
        'provider, model_name, pricing_profile, token_threshold_min, token_threshold_max, input_tokens_1k, output_tokens_1k, cache_read_1k, cache_write_1k, currency, source',
      )
      .eq('is_active', true)
      .order('token_threshold_min', { ascending: true })
  }
}
