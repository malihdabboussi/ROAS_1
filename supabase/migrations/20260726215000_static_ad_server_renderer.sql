BEGIN;

DO $migration$
DECLARE
  old_body text;
  new_body text;
  render_start integer;
  imagery_start integer;
BEGIN
  SELECT markdown_content
  INTO old_body
  FROM public.skill_library
  WHERE skill_key = 'static-ad-book'
  FOR UPDATE;

  IF old_body IS NULL THEN
    RAISE EXCEPTION 'static-ad-book skill is missing';
  END IF;

  new_body := replace(
    old_body,
    '5. **Render**: build a spec JSON and run the engine (below). Default size 1080x1350 (4:5 feed); also make 1080x1920 for stories when asked.',
    '5. **Render**: build the exact flat template spec, then call `process_media` with `operation: render_static_ad`, `template_id`, `aspect_ratio` (`4:5` or `9:16`), and `spec`. Call it exactly once per requested output. The server renders at 1080x1350 or 1080x1920, registers the PNG in campaign Media, and creates a native image Deliverable during missions.'
  );

  render_start := strpos(new_body, '## Render engine');
  imagery_start := strpos(new_body, '## Imagery via Higgsfield');
  IF render_start = 0 OR imagery_start <= render_start THEN
    RAISE EXCEPTION 'static-ad-book render engine section was not found';
  END IF;

  new_body :=
    left(new_body, render_start - 1)
    || $renderer$## Render engine

Use the server-side `process_media` operation. Do not use shell execution, Python, Playwright,
a mission working directory, or an image model for final typography.

```json
{"action":"process_media","label":"Rendering exact static ad","data":{"operation":"render_static_ad","template_id":"myth_vs_system","aspect_ratio":"4:5","spec":{"EYEBROW":"What the gurus told you...","HEADLINE_HTML":"YOUR NEXT CAMPAIGN SHOULD NOT TAKE <span class=\"strike\">THREE WEEKS</span>","LIE_PILL":"THAT IS A LIE.","SUBHEAD_HTML":"The system changed.","OLD_TITLE":"OLD WAY","OLD_ROWS_HTML":"<li>Slow briefs</li><li>Manual handoffs</li><li>Weeks of waiting</li>","OLD_RESULT":"THREE WEEKS","NEW_TITLE":"NEW WAY","NEW_ROWS_HTML":"<li>One approved brief</li><li>One production system</li><li>Launch-ready output</li>","NEW_RESULT":"READY NOW","PUNCH":"You need a production system.","CTA":"BUILD FASTER","GUARANTEE":"Exact copy. Deterministic render."}}}
```

- `spec` is a flat object whose keys are the template tokens listed in the family references.
- `_HTML` fields support only the template's safe formatting tags. All ordinary fields are escaped.
- Image fields accept `https` or `data:image` URLs. Higgsfield may create clean source imagery, but never the final copy-bearing image.
- For `use_my_copy`, place the supplied words in the matching spec field verbatim.
- Only returned PNGs from `process_media` are final. Never call `generate_image` for a final static ad.
- Use the returned `deliverable_id`, `media_asset_id`, dimensions, and PNG URL as receipts.

$renderer$
    || substring(new_body from imagery_start);

  IF new_body = old_body THEN
    RAISE EXCEPTION 'static-ad-book server-renderer instructions did not change';
  END IF;

  UPDATE public.agent_skills
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'static-ad-book'
    AND markdown_content = old_body;

  UPDATE public.skill_library
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'static-ad-book';
END
$migration$;

COMMIT;
