-- Verification for <ts>_contact_identifiers_tenant_scope.sql
-- Run on a Supabase dev branch (and prod after deploy). Every query must return 0 rows.

-- 1. No duplicate identifiers within a tenant scope
SELECT owner_key, kind, value, count(*)
FROM contact_identifiers
GROUP BY owner_key, kind, value
HAVING count(*) > 1;

-- 2. No telegram-prefixed identifier values remain
SELECT id, value
FROM contact_identifiers
WHERE kind = 'telegram_chat_id'
  AND value ~ '^(org|user):[^:]+:telegram:';

-- 3. No identifier whose owner_key disagrees with its contact's owner
SELECT ci.id, ci.owner_key, c.org_id, c.user_id
FROM contact_identifiers ci
JOIN contacts c ON c.id = ci.contact_id
WHERE ci.owner_key IS DISTINCT FROM COALESCE(c.org_id, c.user_id);

-- 4. No NULL owner_key
SELECT id FROM contact_identifiers WHERE owner_key IS NULL;

-- 5. Every contact with an email has an email identifier in its own scope
SELECT c.id, c.email
FROM contacts c
WHERE c.email IS NOT NULL
  AND trim(c.email) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM contact_identifiers ci
    WHERE ci.kind = 'email'
      AND ci.value = lower(trim(c.email))
      AND ci.owner_key = COALESCE(c.org_id, c.user_id)
  );

-- 6. Named unique constraint exists (expect exactly 1 row — the exception to "0 rows")
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'contact_identifiers'::regclass
--   AND conname = 'contact_identifiers_owner_kind_value_key';
