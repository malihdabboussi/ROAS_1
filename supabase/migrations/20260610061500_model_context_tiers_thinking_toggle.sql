-- Allow thinking off for Anthropic verbosity models (appends 'none' reasoning level)
update public.llm_model_capabilities
set capability_profile = jsonb_set(
  capability_profile,
  '{reasoning,levels}',
  (capability_profile->'reasoning'->'levels') || '["none"]'::jsonb
),
updated_at = now()
where provider = 'anthropic'
  and capability_profile->'reasoning'->>'transport' = 'verbosity'
  and not (capability_profile->'reasoning'->'levels' ? 'none');

-- 300K + 1M context tiers for Anthropic 1M-context models
update public.llm_model_capabilities
set capability_profile = jsonb_set(
  capability_profile,
  '{context,tiers}',
  jsonb_build_array(
    jsonb_build_object(
      'tokens', 300000,
      'label', '300K',
      'pricingProfile', coalesce(capability_profile->'context'->'tiers'->0->>'pricingProfile', 'standard')
    ),
    jsonb_build_object(
      'tokens', 1000000,
      'label', '1M',
      'pricingProfile', coalesce(capability_profile->'context'->'tiers'->0->>'pricingProfile', 'standard')
    )
  )
),
updated_at = now()
where provider = 'anthropic'
  and context_window_tokens = 1000000;

-- Enable reasoning controls for Gemini (OpenRouter supports the reasoning param)
update public.llm_model_capabilities
set capability_profile = jsonb_set(
  capability_profile,
  '{reasoning}',
  '{"transport":"reasoning.max_tokens","levels":["none","low","medium","high"]}'::jsonb
),
updated_at = now()
where provider = 'google'
  and model_name in ('gemini-3.5-flash', 'gemini-3.1-pro-preview');
