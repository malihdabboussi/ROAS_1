import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  '../../supabase/migrations/20260719223000_provision_private_personal_dashboards.sql',
)

function migrationSql(): string {
  return readFileSync(migrationPath, 'utf8')
}

describe('personal dashboard provisioning migration', () => {
  it('marks dashboards explicitly and limits each member to one per organization', () => {
    const sql = migrationSql()

    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS space_kind/i)
    expect(sql).toMatch(/space_kind = 'personal_dashboard'/i)
    expect(sql).toMatch(/UNIQUE[\s\S]*org_id[\s\S]*user_id/i)
    expect(sql).toMatch(/visibility = 'private'/i)
    expect(sql).toMatch(/share_link_enabled = false/i)
  })

  it('provisions active members idempotently and backfills existing memberships', () => {
    const sql = migrationSql()

    expect(sql).toMatch(/ensure_org_member_personal_dashboard/i)
    expect(sql).toMatch(/AFTER INSERT OR UPDATE OF status ON public\.org_members/i)
    expect(sql).toMatch(/WHERE om\.status = 'active'/i)
    expect(sql).toMatch(/ON CONFLICT \(org_id, user_id\)[\s\S]*DO NOTHING/i)
  })

  it('blocks every share surface and excludes dashboards from shared-read policies', () => {
    const sql = migrationSql()

    expect(sql).toMatch(/space_shares/i)
    expect(sql).toMatch(/space_view_shares/i)
    expect(sql).toMatch(/space_item_shares/i)
    expect(sql).toMatch(/Personal Dashboards cannot be shared/i)
    expect(sql).toMatch(/space_kind <> 'personal_dashboard'/i)
  })

  it('coerces Personal Dashboard item privacy instead of failing inserts', () => {
    const coercePath = resolve(
      process.cwd(),
      '../../supabase/migrations/20260720163000_coerce_personal_dashboard_item_privacy.sql',
    )
    const sql = readFileSync(coercePath, 'utf8')
    expect(sql).toMatch(/NEW\.is_private := true/i)
    expect(sql).toMatch(/NEW\.share_link_enabled := false/i)
    expect(sql).toMatch(/NEW\.share_token := NULL/i)
    expect(sql).not.toMatch(/Personal Dashboard items cannot be shared/i)
  })

  it('retires the two legacy templates without deleting existing spaces', () => {
    const sql = migrationSql()

    expect(sql).toMatch(/slug IN \('ceo-hq', 'meetings'\)/i)
    expect(sql).toMatch(/is_published = false/i)
    expect(sql).not.toMatch(/DELETE FROM public\.spaces/i)
  })
})
