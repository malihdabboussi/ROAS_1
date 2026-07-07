-- Seed per-second pricing for video generation models
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, service_type)
VALUES
  ('replicate', 'veo-3.1-fast', 'video_seconds', '0.10', 'video'),
  ('replicate', 'kling-v3', 'video_seconds', '0.10', 'video'),
  ('replicate', 'grok-imagine-video', 'video_seconds', '0.05', 'video'),
  ('replicate', 'gen-4.5', 'video_seconds', '0.12', 'video'),
  ('replicate', 'fabric-1.0', 'video_seconds', '0.15', 'video'),
  ('google', 'veo-3.1-fast-generate-preview', 'video_seconds', '0.15', 'video')
ON CONFLICT DO NOTHING;
