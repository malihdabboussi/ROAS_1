-- 048: Populate Stripe product + price IDs for Agent Brain add-on
-- TEST account: I08CkoZlhA
-- LIVE account: AmY2Dy43Cs (TODO: create product in live Stripe dashboard, then update stripe_price_id + stripe_product_id)

UPDATE addon_products
SET
  stripe_test_price_id = 'price_1T3dLmI08CkoZlhAqlWw7OVB',
  stripe_test_product_id = 'prod_U1gj2YAF0Lr60a'
WHERE slug = 'agent-brain';
