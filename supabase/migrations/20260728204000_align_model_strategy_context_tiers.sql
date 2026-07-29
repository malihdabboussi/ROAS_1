-- Keep every bounded context size emitted by the strategy router available to validation.
-- The provider models support these smaller windows; listing them here prevents chat from
-- failing before provider execution when a strategy intentionally limits context and cost.
with strategy_context_tiers (provider, model_name, tiers) as (
  values
    (
      'anthropic',
      'claude-opus-5',
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]'::jsonb
    ),
    (
      'anthropic',
      'claude-fable-5',
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":128000,"label":"128K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]'::jsonb
    ),
    (
      'openai',
      'gpt-5.6-terra',
      '[{"tokens":128000,"label":"128K","pricingProfile":"standard"},{"tokens":272000,"label":"272K","pricingProfile":"standard"},{"tokens":1050000,"label":"1.05M","pricingProfile":"extended"}]'::jsonb
    )
)
update public.llm_model_capabilities as capability
set capability_profile = jsonb_set(
      coalesce(capability.capability_profile, '{}'::jsonb),
      '{context,tiers}',
      strategy_context_tiers.tiers,
      true
    ),
    synced_at = now(),
    updated_at = now()
from strategy_context_tiers
where capability.provider = strategy_context_tiers.provider
  and capability.model_name = strategy_context_tiers.model_name;
