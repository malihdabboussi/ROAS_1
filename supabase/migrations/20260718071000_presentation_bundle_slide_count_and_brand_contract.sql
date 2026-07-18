BEGIN;

WITH bundle_counts AS (
  SELECT
    p.id AS presentation_id,
    regexp_count(
      pf.content,
      '<section[^>]*class[[:space:]]*=[[:space:]]*[^>]*[[:<:]]slide[[:>:]][^>]*>',
      1,
      'i'
    )::integer AS slide_count
  FROM public.presentations p
  JOIN public.presentation_files pf
    ON pf.presentation_id = p.id
   AND pf.path = COALESCE(NULLIF(p.metadata->>'entry_file', ''), 'index.html')
  WHERE COALESCE(p.metadata->>'source_mode', '') = 'html_bundle'
)
UPDATE public.presentations p
SET metadata = jsonb_set(
      COALESCE(p.metadata, '{}'::jsonb),
      '{slide_count}',
      to_jsonb(bundle_counts.slide_count),
      true
    ),
    updated_at = now()
FROM bundle_counts
WHERE p.id = bundle_counts.presentation_id
  AND COALESCE((p.metadata->>'slide_count')::integer, -1) <> bundle_counts.slide_count;

DO $migration$
DECLARE
  old_body text := $old_body$# ROAS Webinar Deck Bones

Build one native editable presentation titled `Webinar Deck Bones`. This is the strong first layer future production can expand, not a finished full webinar deck.

## Inputs

- Approved Post-Call Strategy Map and THE PLAN
- Approved Copy Package, especially the title, promise, discover bullets, landing-page copy, and ad angles
- Real host proof, offer details, brand direction, and campaign assets
- Verified client voice plus `dylans-super-voice` for slide language

## Required 10-20 slide bones

1. Title slide using the approved title verbatim
2. Big promise and what the viewer will leave with
3. The problem or current broken approach
4. The big idea or core belief shift
5. The mechanism or named framework
6. Teaching framework and section map
7. One or more decisive teaching slides for the approved discover bullets
8. Real proof or case-study slides, with sources or visible brackets for gaps
9. Recap and offer transition
10. Core product
11. Bonuses
12. Pricing and enrollment path
13. Guarantee, only when verified
14. Real scarcity or urgency, only when verified
15. Clear CTA and next step

Combine or expand these beats as needed, but stay between 10 and 20 slides. The complete offer stack must be understandable from the deck bones.

## Build rules

- Use the environment's native presentation actions and register the artifact in the Space Presentations view.
- Link the presentation to the owning mission subtask.
- Apply one coherent brand and slide-type system across the deck.
- Keep slides visually led and concise. Speaker meaning can live in notes.
- Match the approved title, promise, teaching bullets, offer, and CTA. Do not rewrite locked copy casually.
- Use real proof, price, guarantee, and scarcity. Bracket unknowns instead of inventing them.
- Never export PDF or PPTX inside Vibey.
- Do not pause for a separate outline gate. The Deck Bones artifact is the deliverable for this step.

## Done when

`Webinar Deck Bones` exists as a native editable 10-20 slide presentation, the complete offer stack is present, every unknown is visibly bracketed, and the mission subtask links to it.$old_body$;
  new_body text := $new_body$# ROAS Webinar Deck Bones

Build one native editable presentation titled `Webinar Deck Bones`. This is the strong first layer future production can expand, not a finished full webinar deck.

## Inputs

- Approved Post-Call Strategy Map and THE PLAN
- Approved Copy Package, especially the title, promise, discover bullets, landing-page copy, and ad angles
- Real host proof, offer details, brand direction, and campaign assets
- Verified client voice plus `dylans-super-voice` for slide language

## Load the campaign Theme first

Call `list_themes`, then `get_theme` for the campaign's active Theme before composing slides. The Theme is the saved brand guide: use its colors, fonts, logo, image direction, brand identity, voice, values, and approved campaign media instead of rebuilding a mini brand guide from memory. Pass its `theme_id` to `create_presentation`, then confirm the saved presentation returns that same `theme_id` so reviewers can verify the source.

If a Theme field is marked `not found` in the Market Research Brand Evidence Ledger, keep that element neutral or bracket it for review. Do not invent a logo, font, color, headshot, or social proof asset.

**Example — complete Theme:** Use the saved yellow/black palette, selected logo asset, heading/body fonts, and approved headshots throughout the deck; attach referenced media to the presentation bundle.

**Example — incomplete Theme:** If the Theme has confirmed colors but no logo, use the confirmed palette and a text wordmark placeholder labeled `[LOGO NOT FOUND]` rather than creating a fake logo.

## Required 10-20 slide bones

1. Title slide using the approved title verbatim
2. Big promise and what the viewer will leave with
3. The problem or current broken approach
4. The big idea or core belief shift
5. The mechanism or named framework
6. Teaching framework and section map
7. One or more decisive teaching slides for the approved discover bullets
8. Real proof or case-study slides, with sources or visible brackets for gaps
9. Recap and offer transition
10. Core product
11. Bonuses
12. Pricing and enrollment path
13. Guarantee, only when verified
14. Real scarcity or urgency, only when verified
15. Clear CTA and next step

Combine or expand these beats as needed, but stay between 10 and 20 slides. The complete offer stack must be understandable from the deck bones.

## Build rules

- Use the environment's native presentation actions and register the artifact in the Space Presentations view.
- Link the presentation to the owning mission subtask.
- Apply the active campaign Theme as one coherent brand and slide-type system across the deck.
- Keep slides visually led and concise. Speaker meaning can live in notes.
- Match the approved title, promise, teaching bullets, offer, and CTA. Do not rewrite locked copy casually.
- Use real proof, price, guarantee, and scarcity. Bracket unknowns instead of inventing them.
- Never export PDF or PPTX inside Vibey.
- Do not pause for a separate outline gate. The Deck Bones artifact is the deliverable for this step.

## Done when

`Webinar Deck Bones` exists as a native editable 10-20 slide presentation, its `theme_id` matches the active campaign Theme, the complete offer stack is present, every unknown is visibly bracketed, and the mission subtask links to it.$new_body$;
BEGIN
  UPDATE public.agent_skills
  SET markdown_content = new_body,
      updated_at = now()
  WHERE skill_key = 'roas-webinar-deck'
    AND markdown_content = old_body;

  UPDATE public.skill_library
  SET markdown_content = new_body,
      updated_at = now()
  WHERE skill_key = 'roas-webinar-deck';

  UPDATE public.agent_skills
  SET markdown_content = new_body,
      updated_at = now()
  WHERE agent_key = 'designer'
    AND skill_key = 'roas-webinar-deck'
    AND user_id IS NULL
    AND org_id IS NULL;
END
$migration$;

COMMIT;
