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
      resolve(root, 'supabase/migrations/20260729170000_upgrade_delegation_desk_work_queue.sql'),
      'utf8',
    )
    const migratedBody = sql.match(/\$skillbody\$([\s\S]*?)\$skillbody\$/)?.[1]?.trim()

    expect(migratedBody).toBe(skill)
    expect(sql).toMatch(
      /ON CONFLICT \(agent_key, skill_key\) WHERE user_id IS NULL AND org_id IS NULL/,
    )
  })

  it('upgrades published and instantiated Desks without losing the private intake boundary', () => {
    const sql = readFileSync(
      resolve(root, 'supabase/migrations/20260729170000_upgrade_delegation_desk_work_queue.sql'),
      'utf8',
    )

    expect(sql).toMatch(/UPDATE public\.space_templates/)
    expect(sql).toMatch(/UPDATE public\.spaces/)
    expect(sql).toMatch(/UPDATE public\.space_automations/)
    expect(sql).toMatch(/"label":"Holding tank"/)
    expect(sql).toMatch(/"label":"Ready to delegate"/)
    expect(sql).toMatch(/"id":"done","label":"Done"/)
    expect(sql).toMatch(/WHEN 'packet' THEN 'work_group'/)
  })

  it('installs the protected Delegator and reroutes Desk processing without removing Pixel', () => {
    const skill = readFileSync(
      resolve(root, 'docker/agents/templates/delegator/skills/delegation-desk/SKILL.md'),
      'utf8',
    ).trim()
    const sql = readFileSync(
      resolve(root, 'supabase/migrations/20260729174500_seed_delegator_system_agent.sql'),
      'utf8',
    )
    const migratedBody = sql.match(/\$skill\$([\s\S]*?)\$skill\$/)?.[1]?.trim()

    expect(migratedBody).toBe(skill)
    expect(sql).toMatch(/'delegator'/)
    expect(sql).toMatch(/'Delegator'/)
    expect(sql).toMatch(/'Delegation Manager'/)
    expect(sql).toMatch(/"capability_profile":"system_delegation"/)
    expect(sql).toMatch(/'699e3530-881c-4653-b507-4c4b5993538f'::uuid/)
    expect(sql).toMatch(/INSERT INTO public\.agent_definitions/)
    expect(sql).toMatch(/INSERT INTO public\.agent_skills/)
    expect(sql).toMatch(/agent_key = 'delegator'/)
    expect(sql).toMatch(/Pixel retains its delegation-desk skill/)
  })
})
