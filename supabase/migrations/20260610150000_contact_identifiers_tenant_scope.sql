-- Tenant-scope contact identifiers.
-- The global UNIQUE (kind, value) let one tenant's upsert silently re-point another
-- tenant's identifier row (attachIdentifier onConflict 'kind,value'). Uniqueness must
-- be per owner: the org when one exists, else the personal account.

-- 1. Owner scope column
ALTER TABLE contact_identifiers ADD COLUMN IF NOT EXISTS owner_key uuid;

-- 2. Remove the Telegram value-prefix workaround ('org:<id>:telegram:<chat>' / 'user:<id>:telegram:<chat>')
--    that existed only because uniqueness was global.
UPDATE contact_identifiers
SET value = regexp_replace(value, '^(org|user):[^:]+:telegram:', '')
WHERE kind = 'telegram_chat_id'
  AND value ~ '^(org|user):[^:]+:telegram:';

-- 3. Backfill owner scope from the owning contact
UPDATE contact_identifiers ci
SET owner_key = COALESCE(c.org_id, c.user_id)
FROM contacts c
WHERE c.id = ci.contact_id
  AND ci.owner_key IS NULL;

-- Identifiers whose contact no longer exists cannot be scoped; remove them.
DELETE FROM contact_identifiers WHERE owner_key IS NULL;

-- 4. Dedupe within (owner_key, kind, value), keeping the most recently seen row
DELETE FROM contact_identifiers ci
USING contact_identifiers dup
WHERE ci.owner_key = dup.owner_key
  AND ci.kind = dup.kind
  AND ci.value = dup.value
  AND ci.id <> dup.id
  AND (
    ci.last_seen_at < dup.last_seen_at
    OR (ci.last_seen_at = dup.last_seen_at AND ci.id > dup.id)
  );

-- 5. Drop the global unique constraint (name differs between environments)
DO $$
DECLARE con record;
BEGIN
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'contact_identifiers'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%(kind, value)%'
  LOOP
    EXECUTE format('ALTER TABLE contact_identifiers DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- The old (kind, value) lookup index is superseded by the owner-scoped constraint below.
DROP INDEX IF EXISTS idx_contact_identifiers_kind_value;

-- 6. Enforce owner-scoped uniqueness as a real constraint (PostgREST onConflict inference
--    requires a constraint, not just an index)
ALTER TABLE contact_identifiers ALTER COLUMN owner_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'contact_identifiers'::regclass
      AND conname = 'contact_identifiers_owner_kind_value_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS contact_identifiers_owner_kind_value_key
      ON contact_identifiers (owner_key, kind, value)';
    EXECUTE 'ALTER TABLE contact_identifiers
      ADD CONSTRAINT contact_identifiers_owner_kind_value_key
      UNIQUE USING INDEX contact_identifiers_owner_kind_value_key';
  END IF;
END $$;

-- 7. Heal tenants that lost the old global-unique race and never got identifier rows
INSERT INTO contact_identifiers (contact_id, owner_key, kind, value, confidence, source)
SELECT c.id, COALESCE(c.org_id, c.user_id), 'email', lower(trim(c.email)), 1.0, 'contacts.email'
FROM contacts c
WHERE c.email IS NOT NULL
  AND trim(c.email) <> ''
ON CONFLICT (owner_key, kind, value) DO NOTHING;

INSERT INTO contact_identifiers (contact_id, owner_key, kind, value, confidence, source)
SELECT c.id,
       COALESCE(c.org_id, c.user_id),
       'phone',
       regexp_replace(c.phone, '[^0-9+]', '', 'g'),
       1.0,
       'contacts.phone'
FROM contacts c
WHERE c.phone IS NOT NULL
  AND regexp_replace(c.phone, '[^0-9+]', '', 'g') <> ''
ON CONFLICT (owner_key, kind, value) DO NOTHING;
