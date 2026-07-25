BEGIN;

DO $migration$
DECLARE
  old_body text;
  new_body text;
  old_description text;
  new_description text;
BEGIN
  SELECT markdown_content, description
  INTO old_body, old_description
  FROM public.skill_library
  WHERE skill_key = 'ig-organic-video-ad'
  FOR UPDATE;

  IF old_body IS NULL THEN
    RAISE EXCEPTION 'ig-organic-video-ad skill is missing';
  END IF;

  new_body := replace(
    old_body,
    '- `copy_mode`: `write_for_me` or `use_my_copy`',
    '- `copy_mode`: `write_for_me` or `use_my_copy`
- `copy_approved`: optional boolean; set it only when the initiating user action explicitly approves the supplied exact copy and asks production to start'
  );

  new_body := replace(
    new_body,
    '- For `write_for_me`, load `dylans-super-voice`, inspect the campaign and source Ads Research deliverables, then propose three concise sticker-copy options. Include pill, headline, highlight phrase, CTA, and one caption for each option.
- For `use_my_copy`, repeat the supplied copy verbatim for confirmation.
- Stop for approval before generating footage or rendering.',
    '- For `write_for_me`, load `dylans-super-voice`, inspect the campaign and source Ads Research deliverables, then propose three concise sticker-copy options. Include pill, headline, highlight phrase, CTA, and one caption for each option. `write_for_me` cannot bypass copy approval.
- For `use_my_copy` with `copy_approved: true`, preserve every supplied field verbatim and proceed directly to Stage 2. Treat the flag as valid only when the exact copy is complete and the current UI action or chat message explicitly approved it and asked production to start.
- For `use_my_copy` without `copy_approved: true`, repeat the supplied copy verbatim for confirmation.
- Stop for approval before generating footage or rendering unless the exact-copy pre-approval rule above applies.'
  );

  IF new_body = old_body THEN
    RAISE EXCEPTION 'ig-organic-video-ad preapproved-copy instructions did not match';
  END IF;

  new_description := replace(
    old_description,
    'Runs an explicit copy approval stage,',
    'Runs an explicit copy approval stage while allowing an exact-copy launch that the user already approved,'
  );

  UPDATE public.agent_skills
  SET
    markdown_content = new_body,
    description = new_description,
    updated_at = now()
  WHERE skill_key = 'ig-organic-video-ad'
    AND markdown_content = old_body;

  UPDATE public.skill_library
  SET
    markdown_content = new_body,
    description = new_description,
    updated_at = now()
  WHERE skill_key = 'ig-organic-video-ad';
END
$migration$;

COMMIT;
