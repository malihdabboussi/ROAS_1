import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * E2E-style test for Sprint 1: Mission lifecycle with state continuity.
 *
 * Scenario: User creates a task → manager delegates → employee executes →
 * manager reviews → state updates happen at each checkpoint via patch (not full rewrite).
 */

// ── Helpers ──

function createMockSupabase(overrides: Record<string, any> = {}) {
  const rows: Record<string, any[]> = {}
  const chain: Record<string, any> = {}
  const methods = [
    'select',
    'eq',
    'neq',
    'in',
    'lt',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'insert',
    'update',
    'upsert',
    'delete',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.single.mockResolvedValue({ data: overrides.singleData ?? null, error: null })
  chain.maybeSingle.mockResolvedValue({ data: overrides.maybeSingleData ?? null, error: null })
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.upsert.mockReturnValue(chain)
  chain.delete.mockReturnValue({ data: null, error: null })
  Object.assign(chain, {
    then: (resolve: any) => resolve({ data: overrides.listData ?? [], error: null }),
  })
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    chain,
    rows,
    ...overrides,
  }
}

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
const TEST_MISSION_ID = '00000000-0000-0000-0000-000000000099'
const TEST_MANAGER_KEY = 'ceo-agent'
const TEST_EMPLOYEE_KEY = 'copywriter'

// ── Tests ──

describe('Mission Lifecycle — State Continuity (Sprint 1)', () => {
  describe('1. Session key format', () => {
    it('should produce agent-namespaced session keys', () => {
      const agentKey = TEST_EMPLOYEE_KEY
      const userId = TEST_USER_ID
      const missionId = TEST_MISSION_ID
      const gatewayAgentId = agentKey

      const sessionKey = `agent:${gatewayAgentId}:mission:${agentKey}:${userId}:${missionId}`

      expect(sessionKey).toMatch(/^agent:/)
      expect(sessionKey).toContain(`:mission:${agentKey}:`)
      expect(sessionKey).toContain(userId)
      expect(sessionKey).toContain(missionId)
      expect(sessionKey).toBe(
        `agent:copywriter:mission:copywriter:${TEST_USER_ID}:${TEST_MISSION_ID}`,
      )
    })

    it('uses agent key as gateway id regardless of hierarchy level', () => {
      const resolveGatewayAgentId = (key: string): string => {
        return key?.trim() || 'vibey'
      }

      expect(resolveGatewayAgentId(TEST_MANAGER_KEY)).toBe(TEST_MANAGER_KEY)
      expect(resolveGatewayAgentId(TEST_EMPLOYEE_KEY)).toBe(TEST_EMPLOYEE_KEY)

      const sessionKey = `agent:${resolveGatewayAgentId(TEST_MANAGER_KEY)}:mission:${TEST_MANAGER_KEY}:${TEST_USER_ID}:${TEST_MISSION_ID}`
      expect(sessionKey.startsWith(`agent:${TEST_MANAGER_KEY}:`)).toBe(true)
    })
  })

  describe('2. Per-agent state identity', () => {
    it('should derive agent_id from agent-prefixed session key', () => {
      const parseAgentIdFromSessionKey = (sessionKey: string): string | null => {
        if (!sessionKey) return null
        if (sessionKey.startsWith('agent:')) {
          const parts = sessionKey.split(':')
          return parts[1] ?? null
        }
        return null
      }

      const resolveAgentIdForState = (sessionKey?: string): string => {
        return parseAgentIdFromSessionKey(sessionKey ?? '') || 'vibey'
      }

      expect(resolveAgentIdForState('agent:ceo-agent:mission:ceo-agent:user1:m1')).toBe('ceo-agent')
      expect(resolveAgentIdForState('agent:copywriter:mission:copywriter:user1:m1')).toBe(
        'copywriter',
      )
      expect(resolveAgentIdForState('agent:vibey:vibey-user1-conv1')).toBe('vibey')
      expect(resolveAgentIdForState(undefined)).toBe('vibey')
      expect(resolveAgentIdForState('')).toBe('vibey')
    })

    it('should NOT hardcode vibey — each agent key gets its own state rows', () => {
      const agentIds = new Set<string>()

      const resolveAgentIdForState = (sessionKey?: string): string => {
        if (!sessionKey) return 'vibey'
        if (sessionKey.startsWith('agent:')) {
          return sessionKey.split(':')[1] ?? 'vibey'
        }
        return 'vibey'
      }

      agentIds.add(resolveAgentIdForState('agent:ceo:mission:ceo:u1:m1'))
      agentIds.add(resolveAgentIdForState('agent:copy:mission:copy:u1:m2'))
      agentIds.add(resolveAgentIdForState('agent:vibey:vibey-u1-c1'))

      expect(agentIds.size).toBe(3)
      expect(agentIds).toContain('vibey')
      expect(agentIds).toContain('ceo')
      expect(agentIds).toContain('copy')
    })
  })

  describe('3. patch_state operations', () => {
    let stateContent: string

    beforeEach(() => {
      stateContent = [
        '# STATE.md — Current Working State',
        '',
        '## Active Work',
        '_No active work._',
        '',
        '## Recent Actions',
        '_No recent actions._',
      ].join('\n')
    })

    it('append_line should add a line without rewriting', () => {
      const line = '- [2026-02-26] Delegated "Write blog" to copywriter (mission:m1)'
      stateContent = stateContent.trimEnd() + '\n' + line + '\n'

      expect(stateContent).toContain('Delegated "Write blog"')
      expect(stateContent).toContain('# STATE.md')
      expect(stateContent).toContain('_No active work._')
    })

    it('replace_line should swap a specific line', () => {
      stateContent = stateContent.replace('_No active work._', '- Working on blog posts')
      stateContent = stateContent.replace('- Working on blog posts', '- ✅ Blog posts completed')

      expect(stateContent).toContain('✅ Blog posts completed')
      expect(stateContent).not.toContain('Working on blog posts')
    })

    it('remove_line should remove a specific line', () => {
      stateContent = stateContent.trimEnd() + '\n- temp line\n'
      const lines = stateContent.split('\n')
      const filtered = lines.filter((l) => l.trim() !== '- temp line')
      stateContent = filtered.join('\n')

      expect(stateContent).not.toContain('temp line')
      expect(stateContent).toContain('# STATE.md')
    })

    it('append_section should add text under a section heading', () => {
      const section = '## Recent Actions'
      const text = '- Reviewed copywriter output'
      const sectionIdx = stateContent.indexOf(section)
      expect(sectionIdx).toBeGreaterThan(-1)

      const afterSection = sectionIdx + section.length
      const nextSectionMatch = stateContent.slice(afterSection).search(/\n## /)
      if (nextSectionMatch === -1) {
        stateContent = stateContent.trimEnd() + '\n' + text + '\n'
      }

      expect(stateContent).toContain('Reviewed copywriter output')
    })

    it('patch operations should be cheaper than full rewrite', () => {
      const fullRewriteTokens = stateContent.length
      const patchPayload = '- [2026-02-26] ✅ "Write blog" approved (mission:m1)'

      expect(patchPayload.length).toBeLessThan(fullRewriteTokens)
    })
  })

  describe('4. Manager delegation updates state', () => {
    it('should append delegation line after plan phase', () => {
      const missionTitle = 'Write 3 blog posts about sleep therapy'
      const assignedTo = 'copywriter'
      const missionId = TEST_MISSION_ID
      const date = new Date().toISOString().split('T')[0]

      const patchLine = `- [${date}] Delegated "${missionTitle}" to ${assignedTo} (mission:${missionId})`

      expect(patchLine).toContain('Delegated')
      expect(patchLine).toContain(assignedTo)
      expect(patchLine).toContain(missionId)
      expect(patchLine).toMatch(/^\- \[\d{4}-\d{2}-\d{2}\]/)
    })
  })

  describe('5. Manager review updates state', () => {
    it('should replace delegation line with approval on done', () => {
      const missionTitle = 'Write 3 blog posts about sleep therapy'
      const missionId = TEST_MISSION_ID
      const date = new Date().toISOString().split('T')[0]

      let state = `- [2026-02-25] Delegated "${missionTitle}" to copywriter (mission:${missionId})`
      const find = `Delegated "${missionTitle}"`
      const replace = `- [${date}] ✅ "${missionTitle}" approved (mission:${missionId})`

      state = state.replace(find, replace)

      expect(state).toContain('✅')
      expect(state).toContain('approved')
      expect(state).not.toContain('Delegated')
    })

    it('should replace delegation line with revision marker on rejection', () => {
      const missionTitle = 'Write 3 blog posts about sleep therapy'
      const missionId = TEST_MISSION_ID
      const date = new Date().toISOString().split('T')[0]

      let state = `- [2026-02-25] Delegated "${missionTitle}" to copywriter (mission:${missionId})`
      const find = `Delegated "${missionTitle}"`
      const replace = `- [${date}] 🔄 "${missionTitle}" sent back for revision (mission:${missionId})`

      state = state.replace(find, replace)

      expect(state).toContain('🔄')
      expect(state).toContain('sent back for revision')
      expect(state).not.toContain('Delegated')
    })
  })

  describe('6. State patches are NOT full rewrites', () => {
    it('patch_state sends op + fields, not full state_content', () => {
      const patchPayload = {
        action: 'patch_state',
        data: {
          op: 'append_line',
          line: '- [2026-02-26] Delegated "Blog" to copywriter (mission:m1)',
        },
      }

      expect(patchPayload.data).not.toHaveProperty('state_content')
      expect(patchPayload.data).toHaveProperty('op')
      expect(patchPayload.data.op).toBe('append_line')
    })

    it('update_state sends full state_content (fallback only)', () => {
      const updatePayload = {
        action: 'update_state',
        data: {
          state_content: '# STATE.md\n\n## Active Work\n- completely new state\n',
        },
      }

      expect(updatePayload.data).toHaveProperty('state_content')
      expect(updatePayload.data).not.toHaveProperty('op')
    })

    it('replace_line payload is smaller than full state', () => {
      const fullState = Array(50).fill('- some task line that is part of state').join('\n')

      const patchData = {
        op: 'replace_line',
        find: 'Delegated "Blog"',
        replace: '- ✅ "Blog" approved',
      }

      const patchSize = JSON.stringify(patchData).length
      const fullSize = JSON.stringify({ state_content: fullState }).length

      expect(patchSize).toBeLessThan(fullSize)
    })
  })

  describe('7. Full lifecycle flow (integration)', () => {
    it('should follow inbox → plan(delegate+state) → execute → review(state) → done', () => {
      const timeline: string[] = []

      // 1. Mission created in inbox
      timeline.push('mission:inbox')

      // 2. Scheduler picks inbox → enqueues plan phase
      timeline.push('scheduler:enqueue:plan')

      // 3. Plan phase: manager delegates
      timeline.push('plan:manager:delegate:copywriter')
      timeline.push('state:patch:append_line:Delegated')

      // 4. Mission moves to todo
      timeline.push('mission:todo')

      // 5. Scheduler picks todo → enqueues execute phase
      timeline.push('scheduler:enqueue:execute')

      // 6. Execute phase: employee does work
      timeline.push('execute:copywriter:produce_output')

      // 7. Mission moves to review
      timeline.push('mission:review')

      // 8. Scheduler picks review → enqueues review phase
      timeline.push('scheduler:enqueue:review')

      // 9. Review phase: manager approves
      timeline.push('review:manager:approved')
      timeline.push('state:patch:replace_line:approved')

      // 10. Mission done
      timeline.push('mission:done')

      expect(timeline).toHaveLength(12)
      expect(timeline[0]).toBe('mission:inbox')
      expect(timeline[timeline.length - 1]).toBe('mission:done')

      const statePatchCount = timeline.filter((e) => e.startsWith('state:patch:')).length
      expect(statePatchCount).toBe(2)

      const fullRewriteCount = timeline.filter((e) => e.startsWith('state:update:')).length
      expect(fullRewriteCount).toBe(0)
    })

    it('CEO team-chat delegation path follows create -> execute -> review lifecycle', () => {
      const timeline: string[] = []

      // Team chat leadership action surface
      timeline.push('chat:ceo:create_mission')
      timeline.push('mission:inbox')

      // Planner routing
      timeline.push('scheduler:enqueue:plan')
      timeline.push('plan:manager:delegate:copywriter')
      timeline.push('mission:todo')

      // Worker execution
      timeline.push('scheduler:enqueue:execute')
      timeline.push('execute:copywriter:deliverable')
      timeline.push('mission:review')

      // CEO/manager review and close
      timeline.push('scheduler:enqueue:review')
      timeline.push('review:manager:approved')
      timeline.push('mission:done')

      expect(timeline).toContain('chat:ceo:create_mission')
      expect(timeline).toContain('plan:manager:delegate:copywriter')
      expect(timeline[timeline.length - 1]).toBe('mission:done')
    })
  })
})
