-- Seedance 2.0 on Replicate: wholesale USD per second (720p tiers). IMAGE_MARGIN=2 applies in agent-api billing.
INSERT INTO token_providers_pricing (provider, model_name, unit_type, cost_per_unit, service_type)
VALUES
  ('replicate', 'seedance-2-video-in', 'video_seconds', '0.29', 'video'),
  ('replicate', 'seedance-2-text', 'video_seconds', '0.17', 'video')
ON CONFLICT DO NOTHING;
