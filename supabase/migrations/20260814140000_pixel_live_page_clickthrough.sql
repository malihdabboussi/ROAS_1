-- Pixel live-page QC: a request to click through a funnel and register a test
-- lead is authorization to submit a fake identity and inspect the real
-- confirmation page. The previous Interactive Browser QC section told Pixel
-- not to submit contact details and to report the gated step as untested,
-- which is why it asked for a confirmation URL instead of clicking Register Now.

DO $$
DECLARE
  tools_row record;
  qc_start integer;
  next_heading integer;
  unclear_start integer;
  deliverable_start integer;
  replace_end integer;
  next_content text;
  qc_guidance constant text := $guidance$### Interactive Browser QC

Clicking a live page, filling a form, registering a test lead, and reviewing the confirmation page require the browser tool. `web_fetch` returns text/markdown only — it cannot type, click Register Now, submit, or follow a JavaScript confirmation.

When the browser tool is available and the user asks to QC, click through, register, or fill a live page:
- Open the URL in the browser, snapshot the visible form, and click the real controls.
- Fill every required field, then click the visible CTA (Register Now, Submit, Get Access, and similar).
- Wait for navigation and inspect the actual resulting page. Compare dates, times, and offer copy against the registration page.
- Judge visible prices, copy, and layout from the rendered page. Automation-facing text can include hidden, stale, or contradictory checkout values; reconcile those against what the user would see.

A request to QC a funnel, click through it, or register a test lead is authorization to submit an obviously fake test identity: name Test Lead, email `qa+{unix}@roas.co`, US phone (555) 010-0100. Do not use the user's real identity unless they asked you to fill the form as them. Do not ask them to send a confirmation URL or guess `/thank-you` while the submit button was on the page.

When filling a form as the user, retrieve their identity from User Brain first, then type those values into the live form. Do not ask them to paste bullets Brain already holds.

Leave unpaid checkout, card entry, and real purchases untested unless the user explicitly authorizes that step. If the browser tool is missing or blocked, say you could not click through the live page. Do not claim a registration from fetch alone.
$guidance$;
BEGIN
  SELECT id, content
  INTO tools_row
  FROM public.agent_definitions
  WHERE user_id IS NULL
    AND org_id IS NULL
    AND agent_key = 'vibey'
    AND file_name = 'TOOLS.md'
  LIMIT 1;

  IF tools_row.id IS NULL THEN
    RAISE EXCEPTION 'Global Vibey TOOLS.md definition was not found';
  END IF;

  qc_start := strpos(tools_row.content, '### Interactive Browser QC');
  unclear_start := strpos(tools_row.content, E'\nFor unclear,');
  deliverable_start := strpos(tools_row.content, E'\nFor deliverable work:');

  IF qc_start > 0 THEN
    next_heading := strpos(substr(tools_row.content, qc_start + 3), E'\n### ');
    IF next_heading > 0 THEN
      next_heading := qc_start + 2 + next_heading;
    END IF;

    replace_end := 0;
    IF next_heading > 0 THEN
      replace_end := next_heading;
    END IF;
    IF deliverable_start > qc_start AND (replace_end = 0 OR deliverable_start < replace_end) THEN
      replace_end := deliverable_start;
    END IF;
    IF unclear_start > qc_start AND (replace_end = 0 OR unclear_start < replace_end) THEN
      replace_end := unclear_start;
    END IF;
    IF replace_end = 0 THEN
      RAISE EXCEPTION 'Global Vibey TOOLS.md browser QC section is malformed';
    END IF;

    next_content :=
      left(tools_row.content, qc_start - 1) ||
      qc_guidance ||
      substr(tools_row.content, replace_end);
  ELSE
    IF unclear_start = 0 THEN
      RAISE EXCEPTION 'Global Vibey TOOLS.md clarification anchor was not found';
    END IF;

    next_content :=
      left(tools_row.content, unclear_start - 1) ||
      E'\n\n' ||
      qc_guidance ||
      substr(tools_row.content, unclear_start);
  END IF;

  UPDATE public.agent_definitions
  SET
    content = next_content,
    updated_at = now()
  WHERE id = tools_row.id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE id = tools_row.id
      AND content LIKE '%registering a test lead%'
      AND content LIKE '%Register Now%'
      AND content LIKE '%qa+{unix}@roas.co%'
      AND content LIKE '%Do not ask them to send a confirmation URL%'
      AND content NOT LIKE '%State exactly which gated step remains untested%'
  ) THEN
    RAISE EXCEPTION 'Pixel live-page click-through guidance was not persisted';
  END IF;
END
$$;
