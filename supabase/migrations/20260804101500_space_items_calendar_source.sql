-- Meeting workspace resolve inserts scheduled calls with source='calendar'
-- (see MeetingWorkspaceResolutionRepository.createScheduledMeeting).
-- space_items_source_check never allowed that value, so Open meeting failed
-- with: new row for relation "space_items" violates check constraint
-- "space_items_source_check".

ALTER TABLE public.space_items
  DROP CONSTRAINT IF EXISTS space_items_source_check;

ALTER TABLE public.space_items
  ADD CONSTRAINT space_items_source_check
  CHECK (source IN ('manual', 'agent', 'agent_suggested', 'template', 'fathom', 'calendar'));
