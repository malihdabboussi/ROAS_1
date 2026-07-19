-- Phase 1 Meta Ads Launch skill for Blaze / ads_manager.
INSERT INTO public.skill_library (
  skill_key, name, description, markdown_content, category, updated_at
)
VALUES (
  'roas-meta-ads-launch',
  'ROAS Meta Ads Launch',
  'Compiles approved copy and creative, verifies the exact Meta account and launch settings, then builds campaigns, ad sets, and ads in PAUSED state after human approval. PageGrader is read-only discovery context. Vibey owns Meta publishing and the audit trail.',
  $skill$# ROAS Meta Ads Launch

Use this skill when approved ad assets are ready to be assembled and built in Meta. This is a media-buying and activation skill for Blaze. It does not write net-new copy and does not design creative.

## Ownership

- Blaze owns asset reconciliation, campaign structure, Meta tool execution, verification, and launch reporting.
- Ivy owns missing or revised copy.
- Lux owns missing or revised visual creative.
- The human owns account approval and final live activation.
- PageGrader supplies read-only client-to-Meta mapping context. Never request, copy, or expose its Meta tokens or PageGrader API key. Never publish through PageGrader.

## Step 1: Compile the launch manifest

Review the Space Meta Ads view, the approved Media Plan, Docs, Funnels, and any supplied Google Doc, Drive, image, or video links. Map each ad to:

- continuous primary text
- headline and description
- approved creative source
- destination URL
- audience and placement
- budget and schedule
- tracking and pixel requirements

Do not split ad copy into Hook, Body, and CTA sections. Do not write missing copy or design missing creative. Assign the gap to Ivy, Lux, or the human. Save `ADS#1 - Meta Launch Manifest` as a native editable Doc. Never create a PDF.

## Gate 1: Human approval before Meta mutation

Stop until the human confirms:

- the exact Meta ad account
- Page and pixel
- campaign objective
- budget and schedule
- destination URL
- approved ad list
- Meta is connected in Vibey

If PageGrader recommends one account, treat it as context, not authorization. If multiple accounts exist or PageGrader conflicts with Vibey, require an explicit human choice.

## Step 2: Build everything PAUSED

After Gate 1, use Vibey Meta actions to create the approved campaign, ad sets, and ads. All objects must be created in PAUSED state. Never activate delivery during this step. Record every returned local ID and Meta ID, then verify the build and status.

Save `ADS#2 - Paused Meta Build Report` as a native editable Doc with direct review links, warnings, and the full asset-to-Meta mapping. Never create a PDF.

## Gate 2: Human activation

The human reviews copy, creative, URL, tracking, audience, placements, budget, schedule, and statuses in Meta. Individual Meta ad activation is not currently exposed as a Vibey action, so the human activates the approved build in Meta and records the activation time or exact revision request.

## Writing rule

Load `dylans-super-voice` as the exclusive authority for every written update, report, client message, and gate summary. Do not load `human-written-copy` or `dylans-voice`. Run the literal no-em-dash and anti-AI-pattern check before saving or sending anything.
$skill$,
  'paid_media',
  now()
)
ON CONFLICT (skill_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  category = EXCLUDED.category,
  updated_at = now();

INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)
VALUES ('ads_manager', 'roas-meta-ads-launch', true)
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, 'ads_manager', skill_key, name, description, markdown_content, true, 'system'
FROM public.skill_library
WHERE skill_key = 'roas-meta-ads-launch'
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

-- Give already-hired media buyers the new launch skill when they carry a standard ads skill.
INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT DISTINCT
  marker.user_id,
  marker.org_id,
  marker.agent_key,
  library.skill_key,
  library.name,
  library.description,
  library.markdown_content,
  true,
  'template'
FROM public.agent_skills marker
CROSS JOIN public.skill_library library
WHERE marker.skill_key IN ('roas-market-research', 'roas-ad-kit')
  AND library.skill_key = 'roas-meta-ads-launch'
  AND (marker.user_id IS NOT NULL OR marker.org_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skills existing
    WHERE existing.agent_key = marker.agent_key
      AND existing.skill_key = library.skill_key
      AND existing.user_id IS NOT DISTINCT FROM marker.user_id
      AND existing.org_id IS NOT DISTINCT FROM marker.org_id
  );
