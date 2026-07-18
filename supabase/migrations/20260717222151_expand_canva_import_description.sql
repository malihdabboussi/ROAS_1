UPDATE public.integrations_available
SET
  description = 'Connect Canva to open Vibey images, documents, and presentations as editable Canva designs.',
  updated_at = now()
WHERE id = 'canva';
