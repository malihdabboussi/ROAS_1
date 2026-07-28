import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd(), '../..')

describe('Delegation Desk provisioning', () => {
  it('seeds the marked private-intake template and Pixel automation', () => {
    const sql = readFileSync(
      resolve(root, 'supabase/migrations/20260728203000_seed_delegation_desk_space_template.sql'),
      'utf8',
    )

    expect(sql).toMatch(/'delegation-desk'/)
    expect(sql).toMatch(/"delegation_desk": true/)
    expect(sql).toMatch(/"type":"task_created","in_status":"inbox","is_subtask":false/)
    expect(sql).toMatch(/"agent_key": "vibey"/)
    expect(sql).toMatch(/'Process delegation intake'/)
  })

  it('keeps the system skill migration synchronized with Pixel runtime bootstrap', () => {
    const skill = readFileSync(
      resolve(root, 'docker/agents/vibey/skills/delegation-desk/SKILL.md'),
      'utf8',
    ).trim()
    const sql = readFileSync(
      resolve(root, 'supabase/migrations/20260728203100_seed_pixel_delegation_desk_skill.sql'),
      'utf8',
    )
    const migratedBody = sql.match(/\$skillbody\$([\s\S]*?)\$skillbody\$/)?.[1]?.trim()

    expect(migratedBody).toBe(skill)
    expect(sql).toMatch(
      /ON CONFLICT \(agent_key, skill_key\) WHERE user_id IS NULL AND org_id IS NULL/,
    )
  })
})
