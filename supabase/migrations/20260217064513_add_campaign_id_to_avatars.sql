
-- Add campaign_id column to avatars (nullable, matches pattern of other artifact tables)
ALTER TABLE avatars ADD COLUMN campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;

-- Backfill: set campaign_id from the linked offer's campaign_id
UPDATE avatars a
SET campaign_id = o.campaign_id
FROM offers o
WHERE a.offer_id = o.id
  AND o.campaign_id IS NOT NULL;

-- Create index for campaign-scoped queries (matches other artifact tables)
CREATE INDEX idx_avatars_campaign_id ON avatars(campaign_id);
;
