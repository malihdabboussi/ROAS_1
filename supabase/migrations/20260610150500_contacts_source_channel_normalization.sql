-- Normalize contacts.contact_source to a strict channel enum and split the
-- variant ('CSV Import', 'ActiveCampaign', ...) into contact_source_detail.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_source_detail text;

UPDATE contacts
SET
  contact_source_detail = CASE
    WHEN lower(trim(coalesce(contact_source, ''))) = 'csv import' THEN 'csv'
    WHEN lower(trim(coalesce(contact_source, ''))) = 'activecampaign' THEN 'activecampaign'
    WHEN lower(trim(coalesce(contact_source, ''))) = 'gohighlevel' THEN 'gohighlevel'
    WHEN lower(trim(coalesce(contact_source, ''))) = 'identifier' THEN 'identifier'
    WHEN lower(trim(coalesce(contact_source, ''))) = 'fathom' THEN 'fathom'
    WHEN lower(trim(coalesce(contact_source, ''))) IN
      ('funnel','form','widget','telegram','import','manual','manual entry','automation','integration','')
      THEN contact_source_detail
    -- Unknown legacy value: preserve it as the detail so nothing is lost.
    ELSE trim(contact_source)
  END,
  contact_source = CASE
    WHEN lower(trim(coalesce(contact_source, ''))) IN
      ('funnel','form','widget','telegram','import','manual','automation','integration')
      THEN lower(trim(contact_source))
    WHEN lower(trim(coalesce(contact_source, ''))) IN ('csv import','activecampaign','gohighlevel')
      THEN 'import'
    WHEN lower(trim(coalesce(contact_source, ''))) = 'manual entry' THEN 'manual'
    WHEN lower(trim(coalesce(contact_source, ''))) IN ('identifier','fathom') THEN 'integration'
    WHEN lower(trim(coalesce(contact_source, ''))) = '' THEN CASE
      WHEN source = 'funnel' THEN 'funnel'
      WHEN source = 'import' THEN 'import'
      ELSE NULL
    END
    -- Unknown legacy value: classify by the legacy origin column.
    ELSE CASE
      WHEN source = 'funnel' THEN 'funnel'
      WHEN source = 'import' THEN 'import'
      ELSE 'manual'
    END
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'contacts'::regclass
      AND conname = 'contacts_contact_source_channel_check'
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_contact_source_channel_check
      CHECK (
        contact_source IS NULL
        OR contact_source IN
          ('funnel','form','widget','telegram','import','manual','automation','integration')
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE contacts VALIDATE CONSTRAINT contacts_contact_source_channel_check;
