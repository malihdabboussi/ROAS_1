import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../../../../..')
const videoSkill = readFileSync(
  resolve(repoRoot, 'docker/agents/templates/copywriter/skills/roas-video-ad-scripts/SKILL.md'),
  'utf8',
)
const packageSkill = readFileSync(
  resolve(repoRoot, 'docker/agents/templates/copywriter/skills/roas-webinar-copy-package/SKILL.md'),
  'utf8',
)
const migration = readFileSync(
  resolve(repoRoot, 'supabase/migrations/20260720093000_reject_video_script_timecodes.sql'),
  'utf8',
)

describe('video ad script timecode contract', () => {
  it('makes the no-timecode instruction explicit in both writing gates', () => {
    expect(videoSkill).toMatch(/No editing timecodes/)
    expect(videoSkill).toMatch(/without timestamps or time ranges/)
    expect(packageSkill).toMatch(/Reject timestamps, editing timecodes, and time ranges/)
  })

  it('syncs the durable skill library and platform-managed hired-agent copies', () => {
    expect(migration).toContain("WHERE skill_key = 'roas-video-ad-scripts'")
    expect(migration).toContain("WHERE skill_key = 'roas-webinar-copy-package'")
    expect(migration).toContain("source IN ('template', 'system', 'default')")
    expect(migration).toContain('FROM public.skill_library AS library')
  })
})
