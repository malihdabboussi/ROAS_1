UPDATE agent_skills
SET
  description = 'Generate and save Meta ads with TSX-first creative mode and image fallback',
  markdown_content = $$## TSX Creative Mode (MANDATORY)

Before creating an ad, always:
- Read `examples/ads/INDEX.md`
- Read `examples/ads/copy-angles.md`
- Use matching pattern docs from `examples/ads/*`

When theme provides user images (headshots/product images), prefer **TSX-first** ad creation:
- Build responsive TSX creative that supports `1:1`, `4:5`, and `9:16`
- Save TSX in `create_ad` as `generated_tsx`
- Use template references from:
  - `examples/ads/templates/authority-ad.tsx`
  - `examples/ads/templates/product-showcase.tsx`
  - `examples/ads/templates/dual-image-split.tsx`
  - `examples/ads/templates/story-vertical.tsx`

If theme assets are unavailable, fallback to generated image mode (`generate_image`) and save `image_url` + `image_asset_id`.

Never skip examples/copy angles lookup. Never use real people names from references.$$
  || E'\n\n' || markdown_content,
  updated_at = NOW()
WHERE skill_key = 'ad-builder'
  AND markdown_content NOT ILIKE '%TSX Creative Mode (MANDATORY)%';
