DELETE FROM public.space_automation_templates
WHERE template_key IN (
  'hubspot-new-contact-follow-up',
  'hubspot-deal-stage-task'
);
