-- Objective-specific, human-gated Meta Ads audit and optimization skill for Blaze.
INSERT INTO public.skill_library (
  skill_key, name, description, markdown_content, category, updated_at
)
VALUES (
  'roas-meta-ads-audit',
  'ROAS Meta Ads Audit & Optimization',
  'Audits connected Meta ad accounts with live objective-specific performance data, produces evidence-backed recommendations, and applies only explicitly approved campaign or ad-set changes. Use for account reviews, performance problems, budget decisions, creative fatigue, optimization cycles, or recurring Meta monitoring.',
  $skillbody$# ROAS Meta Ads Audit & Optimization

Use this skill when Blaze needs to diagnose a connected Meta ad account, recommend specific improvements, or execute a human-approved optimization cycle.

## Operating boundary

Blaze owns the media-buying analysis, recommendations, approved campaign and ad-set updates, and verification. Atlas owns unresolved client, offer, audience, and success-event context. Ivy owns copy changes. Lux owns creative production. A human approves every Meta mutation.

Read PageGrader as account-mapping context only. Live Meta tools are the authority for connection, performance, and object state.

## 1. Verify context and success

Read the active campaign, Space, Brain, and approved strategy. Confirm:

- client and offer
- audience and funnel
- Meta objective
- actual result action that represents success
- reporting and comparison periods
- selected campaigns, when supplied

Account, Page, and campaign names are routing labels. They are not proof of the client's business model or success metric. If client identity or the primary result action is unresolved, ask Atlas for correction or block the audit instead of choosing a plausible answer.

## 2. Read live Meta evidence

Call `check_meta_connection`. If native Meta reports a missing token, call `get_integration` for Meta before declaring the account disconnected. When it returns a connected Composio account, use the exact read-only account, campaign, and insights action slugs it returns through `use_integration`. Verify the mounted account and compare the requested reporting period with the comparison period. Use `get_meta_ads_insights` for native Meta or the discovered Composio insights action.

Interpret every campaign by its real objective and actual result action. Include spend, impressions, reach, frequency, clicks, CTR, CPC, CPM, results, cost per result, and revenue or ROAS only when the campaign objective and tracking make those fields valid. Reconcile zero or missing results against the returned action breakdown before diagnosing the funnel.

Separate observed facts from inferences. A successful live insights response proves Meta access. Only describe data as unavailable after a Meta tool returns a structured failure.

## 3. Recommend exact actions

For each recommendation include:

- Meta object name and ID
- observed evidence
- diagnosis
- specific action
- expected effect
- confidence
- risk
- budget or status guardrail
- reassessment window

Classify the action as tracking, funnel, creative, audience, budget, or pause. Include a recommendation-only choice for every mutation. Do not recommend scaling from blended ROAS when the actual result action tells a different story.

## 4. Require approval

Stop before mutations. The human may approve, reject, revise, or keep the cycle recommendation-only. Valid approval names each object ID, old value, new value, budget cap, and reassessment timing.

## 5. Apply only the approved set

If the human selected recommendation-only, make no Meta mutation calls. Otherwise use `update_ad_campaign` and `update_ad_set` for native Meta. If native Meta reports a missing token but `get_integration` confirms connected Composio Meta, use only the exact update action slugs returned through `use_integration`. Apply only the approved IDs and values.

Never activate a paused campaign, ad set, or ad. Never expand targeting, budget, schedule, creative, copy, or destination beyond the approved change set. Record every before value, request, returned status, Meta ID, and failure.

## 6. Verify and close the loop

Re-read every affected Meta object. Confirm the post-change values match approval and unrelated controls did not change. Record the next measurement window, decision thresholds, and next audit date. If the cycle remained recommendation-only, record what evidence should trigger the next audit.

Save native editable Docs for the audit, recommendations, applied-change log, and closeout. Never create a PDF.

## Writing rule

Load `dylans-super-voice` as the exclusive authority for every report, recommendation, client update, and gate summary. Do not load `human-written-copy` or `dylans-voice`. Run the literal no-em-dash and anti-AI-pattern check before saving or sending.

## Examples

### Lead campaign with a misleading zero

Meta returns 151 completed registrations but the generic leads field is zero. Treat completed registrations as the actual result action, calculate cost per completed registration, and flag the generic leads mapping as a reporting defect. Do not claim the campaign produced no leads.

### Budget recommendation with a gate

An ad set has stable cost per result and sufficient conversion volume for seven days. Recommend a bounded budget increase, name the exact ad-set ID, current budget, proposed budget, expected effect, risk, and reassessment window. Wait for explicit approval before calling `update_ad_set`.
$skillbody$,
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
VALUES ('ads_manager', 'roas-meta-ads-audit', true)
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, 'ads_manager', skill_key, name, description, markdown_content, true, 'system'
FROM public.skill_library
WHERE skill_key = 'roas-meta-ads-audit'
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

-- Backfill already-hired paid-media agents without overwriting user-authored skills.
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
WHERE marker.skill_key IN ('roas-market-research', 'roas-ad-kit', 'roas-meta-ads-launch')
  AND library.skill_key = 'roas-meta-ads-audit'
  AND (marker.user_id IS NOT NULL OR marker.org_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1
    FROM public.agent_skills existing
    WHERE existing.agent_key = marker.agent_key
      AND existing.skill_key = library.skill_key
      AND existing.user_id IS NOT DISTINCT FROM marker.user_id
      AND existing.org_id IS NOT DISTINCT FROM marker.org_id
  );
