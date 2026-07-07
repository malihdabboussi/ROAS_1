-- Backfill llm_model_capabilities modalities from OpenRouter snapshot (2026-06-05).
-- Source: https://openrouter.ai/api/v1/models architecture.input_modalities

update llm_model_capabilities
set
  display_name = 'Haiku 4.5',
  context_window_tokens = 200000,
  max_output_tokens = 64000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-haiku-4.5';

update llm_model_capabilities
set
  display_name = 'Opus 4.6',
  context_window_tokens = 1000000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-opus-4.6';

update llm_model_capabilities
set
  display_name = 'Opus 4.6 Fast',
  context_window_tokens = 1000000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-opus-4.6-fast';

update llm_model_capabilities
set
  display_name = 'Opus 4.7',
  context_window_tokens = 1000000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-opus-4.7';

update llm_model_capabilities
set
  display_name = 'Opus 4.7 Fast',
  context_window_tokens = 1000000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-opus-4.7-fast';

update llm_model_capabilities
set
  display_name = 'Opus 4.8',
  context_window_tokens = 1000000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-opus-4.8';

update llm_model_capabilities
set
  display_name = 'Opus 4.8 Fast',
  context_window_tokens = 1000000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-opus-4.8-fast';

update llm_model_capabilities
set
  display_name = 'Sonnet 4.6',
  context_window_tokens = 1000000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'anthropic' and model_name = 'claude-sonnet-4.6';

update llm_model_capabilities
set
  display_name = 'DeepSeek V4 Flash',
  context_window_tokens = 1048576,
  max_output_tokens = 131072,
  input_modalities = array['text'],
  output_modalities = array['text'],
  supports_images = false,
  synced_at = now(),
  updated_at = now()
where provider = 'deepseek' and model_name = 'deepseek-v4-flash';

update llm_model_capabilities
set
  display_name = 'Gemini 3.1 Pro',
  context_window_tokens = 1048576,
  max_output_tokens = 65536,
  input_modalities = array['audio','file','image','text','video'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'google' and model_name = 'gemini-3.1-pro-preview';

update llm_model_capabilities
set
  display_name = 'Gemini 3.5 Flash',
  context_window_tokens = 1048576,
  max_output_tokens = 65536,
  input_modalities = array['text','image','video','file','audio'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'google' and model_name = 'gemini-3.5-flash';

update llm_model_capabilities
set
  display_name = 'MiniMax M2.5',
  context_window_tokens = 204800,
  max_output_tokens = 196608,
  input_modalities = array['text'],
  output_modalities = array['text'],
  supports_images = false,
  synced_at = now(),
  updated_at = now()
where provider = 'minimax' and model_name = 'minimax-m2.5';

update llm_model_capabilities
set
  display_name = 'GPT-5.3 Codex',
  context_window_tokens = 400000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'openai' and model_name = 'gpt-5.3-codex';

update llm_model_capabilities
set
  display_name = 'GPT-5.4',
  context_window_tokens = 1050000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'openai' and model_name = 'gpt-5.4';

update llm_model_capabilities
set
  display_name = 'GPT-5.4 Pro',
  context_window_tokens = 1050000,
  max_output_tokens = 128000,
  input_modalities = array['text','image','file'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'openai' and model_name = 'gpt-5.4-pro';

update llm_model_capabilities
set
  display_name = 'GPT-5.5',
  context_window_tokens = 1050000,
  max_output_tokens = 128000,
  input_modalities = array['file','image','text'],
  output_modalities = array['text'],
  supports_images = true,
  synced_at = now(),
  updated_at = now()
where provider = 'openai' and model_name = 'gpt-5.5';
