BEGIN;

DO $migration$
DECLARE
  old_body text;
  new_body text;
BEGIN
  SELECT markdown_content
  INTO old_body
  FROM public.skill_library
  WHERE skill_key = 'ig-organic-video-ad'
  FOR UPDATE;

  IF old_body IS NULL THEN
    RAISE EXCEPTION 'ig-organic-video-ad skill is missing';
  END IF;

  new_body := replace(
    old_body,
    'Visually inspect every final frame, not just an intermediate widget preview. Confirm:',
    'For each returned final MP4, call `analyze_video` with `extract_frames: true`, `transcribe: false`, and `frame_count: 12`. This is visual-only QA: never enable transcription or require Deepgram unless the user separately asks for a spoken-audio transcript. Visually inspect every extracted final frame, not just an intermediate widget preview. Confirm:'
  );

  IF new_body = old_body THEN
    RAISE EXCEPTION 'ig-organic-video-ad visual-QA instructions did not match';
  END IF;

  UPDATE public.agent_skills
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'ig-organic-video-ad'
    AND markdown_content = old_body;

  UPDATE public.skill_library
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'ig-organic-video-ad';
END
$migration$;

COMMIT;
