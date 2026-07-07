-- Owner-scoped email uniqueness for contacts (same owner rule as contact_identifiers):
-- one contact per email per org, and one per email per personal account — instead of
-- per creating user. Fixes the cross-tenant collision where the same email could not
-- exist as both a personal contact and an org contact for the same user, and the gap
-- where two org members could create duplicate org contacts.

-- 1. Merge duplicates within (owner, email): keep the oldest row, repoint children.
--    (Preflight on prod/staging found zero duplicate groups; this is defensive.)
DO $$
DECLARE
  dup record;
  fk record;
  keeper uuid;
  loser uuid;
BEGIN
  FOR dup IN
    SELECT COALESCE(org_id, user_id) AS owner_key,
           email,
           array_agg(id ORDER BY created_at ASC, id ASC) AS ids
    FROM contacts
    WHERE email IS NOT NULL
    GROUP BY 1, 2
    HAVING count(*) > 1
  LOOP
    keeper := dup.ids[1];
    FOREACH loser IN ARRAY dup.ids[2:array_length(dup.ids, 1)] LOOP
      -- Children with unique keys on contact_id: drop colliding rows first.
      DELETE FROM contact_identifiers li
      USING contact_identifiers ki
      WHERE li.contact_id = loser AND ki.contact_id = keeper
        AND li.owner_key = ki.owner_key AND li.kind = ki.kind AND li.value = ki.value;

      DELETE FROM contact_campaign_memberships lm
      USING contact_campaign_memberships km
      WHERE lm.contact_id = loser AND km.contact_id = keeper
        AND lm.campaign_id = km.campaign_id;

      DELETE FROM contact_funnel_memberships lm
      USING contact_funnel_memberships km
      WHERE lm.contact_id = loser AND km.contact_id = keeper
        AND lm.funnel_id = km.funnel_id;

      -- Repoint every remaining FK reference to the keeper (generic over the schema).
      FOR fk IN
        SELECT c.conrelid::regclass AS tbl, a.attname AS col
        FROM pg_constraint c
        JOIN unnest(c.conkey) AS ck(attnum) ON true
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
        WHERE c.confrelid = 'contacts'::regclass AND c.contype = 'f'
      LOOP
        EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', fk.tbl, fk.col, fk.col)
        USING keeper, loser;
      END LOOP;

      DELETE FROM contacts WHERE id = loser;
    END LOOP;
  END LOOP;
END $$;

-- 2. Drop the per-user constraint (name differs between environments)
DO $$
DECLARE con record;
BEGIN
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'contacts'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%(user_id, email)%'
  LOOP
    EXECUTE format('ALTER TABLE contacts DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- 3. Owner-scoped uniqueness. Expression index (no app code upserts on this key);
--    NULL emails stay unconstrained (e.g. Telegram-only contacts).
CREATE UNIQUE INDEX IF NOT EXISTS contacts_owner_email_key
  ON contacts ((COALESCE(org_id, user_id)), email)
  WHERE email IS NOT NULL;
