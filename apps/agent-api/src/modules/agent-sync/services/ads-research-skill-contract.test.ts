import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../../../../..')
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260720221000_ads_research_visual_mission_skill.sql'),
  'utf8',
)

describe('Ads Research skill contract', () => {
  it('routes Space research through the native visual actions', () => {
    expect(migration).toContain('## NATIVE SPACE RESEARCH')
    expect(migration).toContain('search_ads_research_advertisers')
    expect(migration).toContain('run_ads_research_search')
    expect(migration).toContain('save_top_n')
  })

  it('removes the webinar-only output title without overwriting edited hired skills', () => {
    expect(migration).toContain('Use the title required by the active mission output contract')
    expect(migration).toContain('FROM public.skill_library AS library')
    expect(migration).toContain("source IN ('template', 'system', 'default')")
    expect(migration).toContain('skill.markdown_content = library.markdown_content')
  })
})
