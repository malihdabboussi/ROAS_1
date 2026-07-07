-- Fix: missions and mission_deliverables FK to campaigns was NO ACTION, blocking campaign deletion.
-- Change both to ON DELETE CASCADE so deleting a campaign removes its missions and deliverables.

ALTER TABLE missions
  DROP CONSTRAINT missions_campaign_id_fkey,
  ADD CONSTRAINT missions_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;

ALTER TABLE mission_deliverables
  DROP CONSTRAINT mission_deliverables_campaign_id_fkey,
  ADD CONSTRAINT mission_deliverables_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
