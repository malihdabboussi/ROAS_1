import { describe, expect, it } from 'vitest'
import { getActionAgentAvatarSrc } from './flow-builder-agent-avatar.utils'

describe('flow-builder-agent-avatar.utils', () => {
  it('returns roster avatar for send_to_agent actions', () => {
    expect(
      getActionAgentAvatarSrc(
        { type: 'send_to_agent', agent_key: 'vibey', prompt_template: '' },
        [
          {
            participant_id: '1',
            kind: 'agent',
            org_id: null,
            user_id: null,
            agent_key: 'vibey',
            display_name: 'Pixel',
            avatar_url: 'https://cdn.example/vibey.png',
            role_label: null,
            specialties: [],
            accepts_assignments: true,
            delegation_notes: null,
            timezone: null,
            working_hours: null,
            out_of_office_until: null,
            current_load: 0,
            is_ready: true,
            agent_level: null,
            org_role: null,
            email: null,
            created_at: '',
            updated_at: null,
          },
        ],
      ),
    ).toBe('https://cdn.example/vibey.png')
  })
})
