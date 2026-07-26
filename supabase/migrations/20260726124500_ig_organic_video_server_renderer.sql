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
    'Never ask an image or video model to render copy. The bundled renderer is materialized at `skills/ig-organic-video-ad/assets/render_ig_story.py` under the agent workspace. Execute that exact path with Pillow to create a transparent 1080x1920 overlay, then composite it over the clean video with FFmpeg. Do not look for it under the mission working directory.',
    'Never ask an image or video model to render copy. For each clean source video, call `process_media` with `operation: render_ig_story`, the source `url`, `pill_line`, one to four `headline_lines` with exactly one line marked `highlighted: true`, `cta_line`, and one approved `emoji`. The server uses the bundled Pillow layout, Montserrat ExtraBold Italic, Apple Color Emoji, and FFmpeg to return a 1080x1920, exactly 10-second H.264/AAC MP4 in campaign Media. Use the returned MP4 URL and media asset ID as the render evidence. Do not use shell execution, a mission-working-directory script, or a document as a substitute for the returned video.'
  );

  IF new_body = old_body THEN
    RAISE EXCEPTION 'ig-organic-video-ad server-renderer instructions did not match';
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
