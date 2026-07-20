BEGIN;

-- Refresh only hired copies that still match the current library body.
UPDATE public.agent_skills AS skill
SET
  description = $description$Pulls observed competitor ads into the Space Ads Research Library, ranks the strongest references, extracts winning video transcripts, and produces a durable market-research brief for any campaign. Use for market research, competitor research, ad-library research, campaign brand setup, or before recommending ads. Use the native Ads Research actions when a Space is available so the visual evidence is saved with the mission. Do not use this skill to write concepts, copy, scripts, or final creative.$description$,
  markdown_content = replace(
    replace(
      skill.markdown_content,
      $oldtools$## THE TOOLS (platform-managed — always available)$oldtools$,
      $newtools$## NATIVE SPACE RESEARCH

When the mission is attached to a Space, use the native Ads Research actions first because they save the visual evidence where the team can review it.

1. Use `search_ads_research_advertisers` to resolve exact advertiser records for brand searches.
2. Use `run_ads_research_search` for every topic or brand query. It runs the same search as the manual Ads Research view and saves the result snapshot into that Space.
3. Set `save_top_n` for the strongest references so the ads appear in the Space swipe file and remain linked to the research run.
4. Use the platform-managed integrations below for deeper details, transcripts, or a fallback when the native action cannot cover a required source.

## THE TOOLS (platform-managed — always available)$newtools$
    ),
    $oldoutput$Write a durable research document the ad skills can consume. Title it exactly `WEB#4 — Market Research` (legacy titles like "Market Research — [Client]" still match). Include:$oldoutput$,
    $newoutput$Write a durable research document the ad skills can consume. Use the title required by the active mission output contract. Without a mission-specific title, use `Ads Research — [Campaign]`. Webinar Fulfillment may still require `WEB#4 — Market Research`. Include:$newoutput$
  ),
  updated_at = now()
FROM public.skill_library AS library
WHERE skill.skill_key = 'roas-market-research'
  AND library.skill_key = skill.skill_key
  AND skill.source IN ('template', 'system', 'default')
  AND skill.markdown_content = library.markdown_content
  AND skill.markdown_content NOT LIKE '%## NATIVE SPACE RESEARCH%';

UPDATE public.skill_library
SET
  description = $description$Pulls observed competitor ads into the Space Ads Research Library, ranks the strongest references, extracts winning video transcripts, and produces a durable market-research brief for any campaign. Use for market research, competitor research, ad-library research, campaign brand setup, or before recommending ads. Use the native Ads Research actions when a Space is available so the visual evidence is saved with the mission. Do not use this skill to write concepts, copy, scripts, or final creative.$description$,
  markdown_content = replace(
    replace(
      markdown_content,
      $oldtools$## THE TOOLS (platform-managed — always available)$oldtools$,
      $newtools$## NATIVE SPACE RESEARCH

When the mission is attached to a Space, use the native Ads Research actions first because they save the visual evidence where the team can review it.

1. Use `search_ads_research_advertisers` to resolve exact advertiser records for brand searches.
2. Use `run_ads_research_search` for every topic or brand query. It runs the same search as the manual Ads Research view and saves the result snapshot into that Space.
3. Set `save_top_n` for the strongest references so the ads appear in the Space swipe file and remain linked to the research run.
4. Use the platform-managed integrations below for deeper details, transcripts, or a fallback when the native action cannot cover a required source.

## THE TOOLS (platform-managed — always available)$newtools$
    ),
    $oldoutput$Write a durable research document the ad skills can consume. Title it exactly `WEB#4 — Market Research` (legacy titles like "Market Research — [Client]" still match). Include:$oldoutput$,
    $newoutput$Write a durable research document the ad skills can consume. Use the title required by the active mission output contract. Without a mission-specific title, use `Ads Research — [Campaign]`. Webinar Fulfillment may still require `WEB#4 — Market Research`. Include:$newoutput$
  ),
  updated_at = now()
WHERE skill_key = 'roas-market-research'
  AND markdown_content NOT LIKE '%## NATIVE SPACE RESEARCH%';

COMMIT;
