BEGIN;

DELETE FROM public.space_template_items
WHERE template_id = (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar')
  AND title IN (
    'Creative Pack',
    'Validate Messaging Statics',
    'WEB#6 — Validate Messaging Statics',
    'Image Briefs',
    'WEB#6 — Image Briefs',
    'WEB#7 — Image Briefs',
    'Media Plan',
    'WEB#7 — Media Plan',
    'WEB#8 — Media Plan'
  );

INSERT INTO public.space_template_items (
  template_id, kind, title, status, priority, description, body, custom_data, sort_order
)
VALUES
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'WEB#6 — Validate Messaging Statics',
    NULL,
    'medium',
    NULL,
    '<h2>Validate Messaging Statics</h2><p>Filled by Lux with editable light, dark, and bold HTML cuts.</p><p><em>Placeholder until the Validate Messaging statics subtask saves and generates the visual Doc.</em></p>',
    '{}'::jsonb,
    7
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'WEB#7 — Image Briefs',
    NULL,
    'medium',
    NULL,
    '<h2>Image Briefs</h2><p>Filled with ImageGen-ready prompts for photographic and illustrative concepts.</p><p><em>Placeholder until the image-brief subtask saves into this doc.</em></p>',
    '{}'::jsonb,
    8
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar'),
    'doc',
    'WEB#8 — Media Plan',
    NULL,
    'medium',
    NULL,
    '<h2>Media Plan</h2><p>Filled by Blaze after approved creative has been assembled into native Meta ads.</p><p><em>Placeholder until the media-plan subtask saves into this doc.</em></p>',
    '{}'::jsonb,
    9
  );

UPDATE public.space_template_items
SET sort_order = 10
WHERE template_id = (SELECT id FROM public.space_templates WHERE slug = 'agency-client-webinar')
  AND title = 'Start Webinar Fulfillment playbook';

COMMIT;
