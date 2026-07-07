INSERT INTO subscription_plans (
  name, slug, interval, price_amount, base_credits, rollover_cap,
  can_buy_credits, stripe_price_id, is_active,
  max_campaigns, max_published_funnels, max_custom_domains,
  max_brain_entries, max_storage_bytes, max_custom_themes,
  can_voice_input, can_image_gen, can_advanced_analytics,
  can_api_access, can_white_label
) VALUES (
  'Early Access', 'early-access-monthly', 'month', 9700,
  19400, 9700, true, 'price_1TMpAgI08CkoZlhAOT3Tf0je', true,
  NULL, 10, 5, 10000, 26843545600, 10,
  true, true, true, false, false
);
