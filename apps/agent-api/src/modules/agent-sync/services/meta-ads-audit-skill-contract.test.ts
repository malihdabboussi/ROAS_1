import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('roas-meta-ads-audit skill migration', () => {
  const migration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260722011000_meta_ads_audit_skill.sql',
    ),
    'utf8',
  )
  const insightsContractMigration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      '../../supabase/migrations/20260722093500_meta_insights_id_contract.sql',
    ),
    'utf8',
  )

  it('requires live objective-specific evidence before recommendations', () => {
    expect(migration).toMatch(/check_meta_connection/)
    expect(migration).toMatch(/get_meta_ads_insights/)
    expect(migration).toMatch(/actual result action/i)
    expect(migration).toMatch(/observed facts/i)
  })

  it('keeps account mutations bounded by an exact human approval', () => {
    expect(migration).toMatch(/recommendation-only/i)
    expect(migration).toMatch(/update_ad_campaign/)
    expect(migration).toMatch(/update_ad_set/)
    expect(migration).toMatch(/Never activate/i)
  })

  it('seeds future and already-hired Meta ads managers', () => {
    expect(migration).toMatch(/template_skill_assignments/)
    expect(migration).toMatch(/'ads_manager', 'roas-meta-ads-audit'/)
    expect(migration).toMatch(/INSERT INTO public\.agent_skills/)
  })

  it('keeps ROAS scope and Meta hierarchy IDs distinct', () => {
    expect(insightsContractMigration).toMatch(/campaign_id.*ROAS campaign UUID/i)
    expect(insightsContractMigration).toMatch(/row\.id.*ad_campaign_id/i)
    expect(insightsContractMigration).toMatch(/row\.id.*ad_set_id/i)
    expect(insightsContractMigration).toMatch(/Never put a Meta numeric ID/i)
    expect(insightsContractMigration).toMatch(/source IN \('template', 'system', 'default'\)/)
  })
})
