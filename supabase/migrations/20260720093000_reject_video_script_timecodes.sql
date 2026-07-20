BEGIN;

UPDATE public.skill_library
SET
  markdown_content = replace(
    replace(
      replace(
        replace(
          replace(markdown_content,
            $old$- **Overlays** — list the 3-5 caption or text-overlay moments so the editor knows what to burn in.$old$,
            $new$- **Overlays** — list 3-5 exact caption or text-overlay lines in spoken order so the editor can match them to the words. Never add timestamps, timecodes, or time ranges; delivery pacing determines placement during the edit.$new$
          ),
          $old$Then search for the literal `—` character and run the complete Dylan's Super Voice anti-AI checklist across the spoken text, overlays, and client instructions.$old$,
          $new$Then search for the literal `—` character, search for editing timecodes or time ranges such as `0:00-0:05` and `0-3s`, and run the complete Dylan's Super Voice anti-AI checklist across the spoken text, overlays, and client instructions.$new$
        ),
        $old$[overlay moments]$old$,
        $new$[exact overlay lines in spoken order, without timestamps or time ranges]$new$
      ),
      $old$- **Client-clean format.** No quotation marks around scripts and no Hook, Body, CTA, Delivery, or Shot + setting labels in the delivered document.$old$,
      $new$- **Client-clean format.** No quotation marks around scripts and no Hook, Body, CTA, Delivery, or Shot + setting labels in the delivered document.
- **No editing timecodes.** Do not put timestamps or time ranges in scripts, overlays, shooting instructions, or Post-production. Editors match overlay lines to the spoken words; legitimate event times such as "10:00 AM Pacific" remain valid copy.$new$
    ),
    $old$- Forgetting the overlay plan; the editor guesses and the CTA never lands on screen.$old$,
    $new$- Forgetting the overlay plan; the editor guesses and the CTA never lands on screen.
- Timestamping overlays or script beats. Placement changes with the speaker's delivery, so give the exact overlay lines in spoken order instead.$new$
  ),
  updated_at = now()
WHERE skill_key = 'roas-video-ad-scripts'
  AND markdown_content NOT LIKE '%**No editing timecodes.**%';

UPDATE public.skill_library
SET
  markdown_content = replace(
    markdown_content,
    $old$- Each video uses only **Script**, **Shooting instructions**, and **Overlays**, followed by one shared **Post-production** section for all scripts. The spoken script is continuous and unquoted. Do not expose Hook, Body, CTA, Delivery, or Shot + setting labels.$old$,
    $new$- Each video uses only **Script**, **Shooting instructions**, and **Overlays**, followed by one shared **Post-production** section for all scripts. The spoken script is continuous and unquoted. Do not expose Hook, Body, CTA, Delivery, or Shot + setting labels. Reject timestamps, editing timecodes, and time ranges such as `0:00-0:05` or `0-3s`; rerun `roas-video-ad-scripts` to return exact overlay lines in spoken order.$new$
  ),
  updated_at = now()
WHERE skill_key = 'roas-webinar-copy-package'
  AND markdown_content NOT LIKE '%Reject timestamps, editing timecodes, and time ranges%';

-- Runtime skill files are generated from agent_skills. Refresh only platform-managed
-- copies so user-authored skill customizations remain untouched.
UPDATE public.agent_skills AS existing
SET
  name = library.name,
  description = library.description,
  markdown_content = library.markdown_content,
  updated_at = now()
FROM public.skill_library AS library
WHERE existing.skill_key = library.skill_key
  AND existing.skill_key IN ('roas-video-ad-scripts', 'roas-webinar-copy-package')
  AND existing.source IN ('template', 'system', 'default');

COMMIT;
