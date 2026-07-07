UPDATE public.agent_employee_templates
   SET is_enabled = false
 WHERE role_key = 'widget_builder';

UPDATE public.agents_registry
   SET is_active = false
 WHERE agent_key IN ('viktor', 'widget_builder');
