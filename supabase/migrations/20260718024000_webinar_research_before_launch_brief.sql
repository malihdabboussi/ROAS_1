BEGIN;

-- THE PLAN now consumes the completed Market Research mission document. Keep the
-- standalone escape hatch for non-mission use, but require real tool evidence
-- before describing either platform-managed research surface as unavailable.
DO $migration$
DECLARE
  library_rows integer := 0;
  agent_rows integer := 0;
  replacement text := $body$
### Step 2 — Consume completed market research
In a Webinar Fulfillment mission, read the completed `WEB#4 — Market Research` document before building THE PLAN. Treat its observed-source labels, service/action receipts, links, longevity evidence, and recorded fallbacks as the research source of truth. Do not run a second ad-library pass or infer that a provider was unavailable inside THE PLAN.

Outside that mission flow, if no completed market-research document exists, load `roas-market-research` in FULL mode first. A provider or search surface may be described as unavailable only when an actual `use_integration` attempt failed and the returned error plus fallback are recorded. Never turn a missing attempt into an availability claim.

Use the completed research to re-rank the competitive set by observed live activity and longevity. Date-stamp every competitive claim and preserve the distinction between tool-observed, web-inferred, and user-provided evidence.

$body$;
BEGIN
  UPDATE public.skill_library
  SET
    markdown_content = split_part(markdown_content, '### Step 2 — Creative research pass', 1)
      || replacement
      || '### Step 3 — The recommended approach'
      || split_part(markdown_content, '### Step 3 — The recommended approach', 2),
    updated_at = now()
  WHERE skill_key = 'auto-skill-3-roas-launch-brief'
    AND markdown_content LIKE '%### Step 2 — Creative research pass%'
    AND markdown_content LIKE '%### Step 3 — The recommended approach%';
  GET DIAGNOSTICS library_rows = ROW_COUNT;

  UPDATE public.agent_skills
  SET
    markdown_content = split_part(markdown_content, '### Step 2 — Creative research pass', 1)
      || replacement
      || '### Step 3 — The recommended approach'
      || split_part(markdown_content, '### Step 3 — The recommended approach', 2),
    updated_at = now()
  WHERE skill_key = 'auto-skill-3-roas-launch-brief'
    AND markdown_content LIKE '%### Step 2 — Creative research pass%'
    AND markdown_content LIKE '%### Step 3 — The recommended approach%';
  GET DIAGNOSTICS agent_rows = ROW_COUNT;

  IF library_rows = 0 AND agent_rows = 0 THEN
    RAISE EXCEPTION 'auto-skill-3-roas-launch-brief source markers were not found';
  END IF;
END
$migration$;

UPDATE public.agent_skills
SET
  description = replace(
    replace(
      replace(description, 'prj_TuDRfvRZATBoeOhAqfNcvpsfHHTT', 'prj_MTRba5SdYBFbiymrKqieGnGPjcBh'),
      'prj_ABawEUiSMe7b3eX7RgnzaRraJ5tl', 'prj_YwUti53Q9vB6rMKPB5cpW8w7h0qL'
    ),
    'prj_3yuZ9Zx4d4MrWTpss8YhGsAPF1HM', 'prj_QPESSHik40T2659GTyfZSOalJe4T'
  ),
  markdown_content = replace(
    replace(
      replace(markdown_content, 'prj_TuDRfvRZATBoeOhAqfNcvpsfHHTT', 'prj_MTRba5SdYBFbiymrKqieGnGPjcBh'),
      'prj_ABawEUiSMe7b3eX7RgnzaRraJ5tl', 'prj_YwUti53Q9vB6rMKPB5cpW8w7h0qL'
    ),
    'prj_3yuZ9Zx4d4MrWTpss8YhGsAPF1HM', 'prj_QPESSHik40T2659GTyfZSOalJe4T'
  ),
  updated_at = now()
WHERE skill_key = 'bug-checking-and-report';

COMMIT;
