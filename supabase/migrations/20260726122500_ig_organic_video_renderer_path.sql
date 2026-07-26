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
    'Never ask an image or video model to render copy. Use `assets/render_ig_story.py` with Pillow to create a transparent 1080x1920 overlay, then composite it over the clean video with FFmpeg.',
    'Never ask an image or video model to render copy. The bundled renderer is materialized at `skills/ig-organic-video-ad/assets/render_ig_story.py` under the agent workspace. Execute that exact path with Pillow to create a transparent 1080x1920 overlay, then composite it over the clean video with FFmpeg. Do not look for it under the mission working directory.'
  );

  IF new_body = old_body THEN
    RAISE EXCEPTION 'ig-organic-video-ad renderer-path instructions did not match';
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
