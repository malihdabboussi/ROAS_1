-- Keep every bounded context size emitted by the cost-optimized strategy router
-- available to capability validation before provider execution.
with strategy_context_tiers (provider, model_name, tiers) as (
  values
    (
      'anthropic',
      'claude-sonnet-4.6',
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]'::jsonb
    ),
    (
      'anthropic',
      'claude-opus-5',
      '[{"tokens":64000,"label":"64K","pricingProfile":"standard"},{"tokens":128000,"label":"128K","pricingProfile":"standard"},{"tokens":300000,"label":"300K","pricingProfile":"standard"},{"tokens":1000000,"label":"1M","pricingProfile":"standard"}]'::jsonb
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
