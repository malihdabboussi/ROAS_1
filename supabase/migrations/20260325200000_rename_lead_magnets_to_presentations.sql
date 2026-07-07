-- Migration: Rename lead_magnets table and all references to presentations

BEGIN;

-- 1. Drop CHECK constraints on workflow edges FIRST
ALTER TABLE campaign_workflow_edges DROP CONSTRAINT IF EXISTS campaign_workflow_edges_from_type_check;
ALTER TABLE campaign_workflow_edges DROP CONSTRAINT IF EXISTS campaign_workflow_edges_to_type_check;
ALTER TABLE campaign_workflow_edges DROP CONSTRAINT IF EXISTS campaign_workflow_edges_edge_type_check;

-- 2. Migrate existing workflow edge data
UPDATE campaign_workflow_edges SET from_type = 'presentation' WHERE from_type = 'lead_magnet';
UPDATE campaign_workflow_edges SET to_type = 'presentation' WHERE to_type = 'lead_magnet';
UPDATE campaign_workflow_edges SET edge_type = 'funnel_to_presentation' WHERE edge_type = 'funnel_to_lead_magnet';

-- 3. Recreate CHECK constraints with new values
ALTER TABLE campaign_workflow_edges ADD CONSTRAINT campaign_workflow_edges_from_type_check
  CHECK (from_type = ANY (ARRAY['funnel'::text, 'sequence'::text, 'presentation'::text]));
ALTER TABLE campaign_workflow_edges ADD CONSTRAINT campaign_workflow_edges_to_type_check
  CHECK (to_type = ANY (ARRAY['funnel'::text, 'sequence'::text, 'presentation'::text]));
ALTER TABLE campaign_workflow_edges ADD CONSTRAINT campaign_workflow_edges_edge_type_check
  CHECK (edge_type = ANY (ARRAY['funnel_conversion_to_sequence'::text, 'sequence_complete_to_sequence'::text, 'funnel_to_presentation'::text]));

-- 4. Remove from realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.lead_magnets;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 5. Rename the table
ALTER TABLE public.lead_magnets RENAME TO presentations;

-- 6. Rename constraints
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_pkey TO presentations_pkey;
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_campaign_id_fkey TO presentations_campaign_id_fkey;
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_domain_id_fkey TO presentations_domain_id_fkey;
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_offer_id_fkey TO presentations_offer_id_fkey;
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_slug_key TO presentations_slug_key;
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_status_check TO presentations_status_check;
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_theme_id_fkey TO presentations_theme_id_fkey;
ALTER TABLE public.presentations RENAME CONSTRAINT lead_magnets_user_id_fkey TO presentations_user_id_fkey;

-- 7. Rename indexes
ALTER INDEX idx_lead_magnets_campaign RENAME TO idx_presentations_campaign;
ALTER INDEX lead_magnets_slug_idx RENAME TO presentations_slug_idx;

-- 8. Rename RLS policy
ALTER POLICY lead_magnets_own ON public.presentations RENAME TO presentations_own;

-- 9. Add back to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.presentations;

-- 10. Drop billing column
ALTER TABLE public.subscription_plans DROP COLUMN IF EXISTS max_lead_magnets;

-- 11. Update agent_skills row
UPDATE agent_skills
SET skill_key = 'presentation-builder',
    name = 'Presentation Builder',
    description = 'Create premium presentations as interactive React components. Use this skill for slide decks, pitch decks, PDF guides, checklists, cheat sheets, workbooks, case studies, toolkits, ebooks, or any visual slide-based content.'
WHERE skill_key = 'lead-magnet-builder';

-- 12. Update published_url values
UPDATE public.presentations
SET published_url = REPLACE(published_url, '/lm/', '/p/')
WHERE published_url IS NOT NULL AND published_url LIKE '%/lm/%';

COMMIT;
