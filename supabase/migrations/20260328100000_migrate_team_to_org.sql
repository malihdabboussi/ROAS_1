-- ============================================================
-- MIGRATE team_* DATA TO org_* TABLES
-- Converts existing team memberships to organization model.
-- For each distinct team owner, creates an organization +
-- migrates members and campaign permissions.
-- ============================================================

DO $$
DECLARE
  v_owner_id UUID;
  v_owner_name TEXT;
  v_org_id UUID;
  v_member RECORD;
  v_perm RECORD;
  v_invite RECORD;
BEGIN
  -- For each distinct team owner, create an organization
  FOR v_owner_id, v_owner_name IN
    SELECT DISTINCT tm.owner_id, COALESCE(p.full_name, 'Team')
    FROM team_members tm
    JOIN profiles p ON p.id = tm.owner_id
  LOOP
    -- Check if org already exists for this owner
    SELECT id INTO v_org_id
    FROM organizations
    WHERE owner_id = v_owner_id
    LIMIT 1;

    IF v_org_id IS NULL THEN
      -- Create organization
      INSERT INTO organizations (name, slug, owner_id, account_type, status)
      VALUES (
        v_owner_name || '''s Team',
        lower(replace(replace(v_owner_name, ' ', '-'), '''', '')) || '-team-' || substr(gen_random_uuid()::text, 1, 8),
        v_owner_id,
        'team',
        'active'
      )
      RETURNING id INTO v_org_id;

      -- Add owner as org member
      INSERT INTO org_members (org_id, user_id, role, status, accepted_at)
      VALUES (v_org_id, v_owner_id, 'owner', 'active', now())
      ON CONFLICT (org_id, user_id) DO NOTHING;

      RAISE NOTICE 'Created org % for owner % (%)', v_org_id, v_owner_id, v_owner_name;
    END IF;

    -- Migrate team members to org members
    FOR v_member IN
      SELECT tm.user_id, tm.role, tm.status, tm.accepted_at
      FROM team_members tm
      WHERE tm.owner_id = v_owner_id
    LOOP
      INSERT INTO org_members (org_id, user_id, role, status, invited_by, accepted_at)
      VALUES (
        v_org_id,
        v_member.user_id,
        v_member.role,
        v_member.status,
        v_owner_id,
        v_member.accepted_at
      )
      ON CONFLICT (org_id, user_id) DO NOTHING;

      RAISE NOTICE '  Migrated member % (role: %)', v_member.user_id, v_member.role;
    END LOOP;

    -- Set org_id on campaigns that were shared via team_campaign_permissions
    FOR v_perm IN
      SELECT tcp.campaign_id
      FROM team_campaign_permissions tcp
      JOIN team_members tm ON tm.id = tcp.team_member_id
      WHERE tm.owner_id = v_owner_id
    LOOP
      UPDATE campaigns
      SET org_id = v_org_id
      WHERE id = v_perm.campaign_id
        AND org_id IS NULL;

      RAISE NOTICE '  Set org_id on campaign %', v_perm.campaign_id;
    END LOOP;

    -- Migrate pending invitations
    FOR v_invite IN
      SELECT ti.email, ti.role, ti.token, ti.status, ti.created_at
      FROM team_invitations ti
      WHERE ti.owner_id = v_owner_id
        AND ti.status = 'pending'
    LOOP
      INSERT INTO org_invitations (org_id, email, role, token, status, invited_by, expires_at)
      VALUES (
        v_org_id,
        v_invite.email,
        v_invite.role,
        v_invite.token || '-migrated',
        'pending',
        v_owner_id,
        now() + interval '7 days'
      )
      ON CONFLICT DO NOTHING;

      RAISE NOTICE '  Migrated invitation for %', v_invite.email;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Team to org migration complete';
END $$;
