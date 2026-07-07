import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { ReadyEmployeeProfile } from '@/lib/agents/ready-employee-types'
import { ReadyEmployeeLibraryList } from './ReadyEmployeeLibraryList'
import { fetchHrInsightsViaLlm } from './ready-employees-hr-insights-llm'

const chatApiMocks = vi.hoisted(() => ({
  createNewConversation: vi.fn(),
  fetchMessages: vi.fn(),
  sendMessageStreaming: vi.fn(),
}))

vi.mock('@/lib/conversations/conversations-api', () => ({
  createNewConversation: chatApiMocks.createNewConversation,
  fetchMessages: chatApiMocks.fetchMessages,
  sendConversationMessageStreaming: chatApiMocks.sendMessageStreaming,
}))

function profileFixture(overrides: Partial<ReadyEmployeeProfile> = {}): ReadyEmployeeProfile {
  return {
    role_key: 'pm_marketing',
    template_key: 'template-1',
    skill_seed_key: 'seed-1',
    default_name: 'Maya Manager',
    name_pool: ['Maya Manager', 'Mara Manager'],
    role: 'Marketing Manager',
    level: 'manager',
    disc_profile: 'DI',
    tagline: 'Plans launches',
    description: 'Keeps marketing moving.',
    responsibilities: ['Plan launch'],
    skills: ['strategy'],
    core_beliefs: ['Move with clarity'],
    image_url: '/agent.png',
    skill_profiles: [
      {
        skill_key: 'launch_planning',
        name: 'Launch Planning',
        description: 'Builds launch plans.',
      },
    ],
    ...overrides,
  }
}

function agentFixture(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'copywriter',
    name: 'Claire',
    role: 'Copywriter',
    status: 'online',
    skills: [],
    level: 'employee',
    specialty: null,
    image_url: null,
    is_active: true,
    team_id: null,
    config: {},
    created_at: '2026-06-22T10:00:00.000Z',
    updated_at: '2026-06-22T10:00:00.000Z',
    ...overrides,
  }
}

describe('ready employees modal helpers', () => {
  beforeEach(() => {
    chatApiMocks.createNewConversation.mockReset()
    chatApiMocks.fetchMessages.mockReset()
    chatApiMocks.sendMessageStreaming.mockReset()
  })

  it('renders ready employee rows with manager, team, locked states and emits role selections', () => {
    const onSelectRole = vi.fn()
    const manager = profileFixture()
    const designer = profileFixture({
      role_key: 'designer',
      default_name: 'Dina Designer',
      role: 'Designer',
      level: 'employee',
    })

    render(
      <ReadyEmployeeLibraryList
        variant="desktop"
        loading={false}
        filteredProfiles={[manager, designer]}
        selectedRoleKey="pm_marketing"
        getDisplayName={(profile) => profile.default_name}
        onSelectRole={onSelectRole}
        isProfileLocked={(profile) => profile.role_key === 'pm_marketing'}
      />,
    )

    expect(screen.getByText('Maya Manager')).toBeTruthy()
    expect(screen.getByText('Marketing Manager')).toBeTruthy()
    expect(screen.getByText('Manager')).toBeTruthy()
    expect(screen.getByText('Locked')).toBeTruthy()
    expect(screen.getAllByText('Marketing').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /dina designer/i }))

    expect(onSelectRole).toHaveBeenCalledWith('designer')
  })

  it('creates an HR insights conversation, sends the current team prompt, and parses assistant JSON', async () => {
    const insights = {
      team_gaps: [{ gap: 'QA depth', severity: 'high', evidence: 'No QA owner is active.' }],
      team_structure: {
        summary: 'The team needs stronger quality coverage.',
        strengths: ['Copy is covered'],
        improvements: ['Add QA'],
      },
      cascade_hires: [{ agent_key: 'qa_engineer', reason: 'Quality ownership is missing.' }],
    }
    chatApiMocks.createNewConversation.mockResolvedValue({ id: 'conversation-1' })
    chatApiMocks.fetchMessages.mockResolvedValue([
      {
        id: 'message-1',
        role: 'assistant',
        content: `Here is the JSON:\n${JSON.stringify(insights)}`,
      },
    ])

    const result = await fetchHrInsightsViaLlm({
      hrAgentId: 'hr-agent-id',
      agents: [
        agentFixture({ agent_key: 'vibey', level: 'system' }),
        agentFixture({ agent_key: 'copywriter', name: 'Claire', role: 'Copywriter' }),
      ],
      potentialProfiles: [profileFixture({ role_key: 'qa_engineer', role: 'QA Engineer' })],
    })

    expect(chatApiMocks.createNewConversation).toHaveBeenCalledWith({
      title: 'HR Insights',
      agent_id: 'hr-agent-id',
    })
    expect(chatApiMocks.sendMessageStreaming).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: 'conversation-1',
        content: expect.stringContaining('- copywriter: Claire (Copywriter)'),
      }),
    )
    expect(chatApiMocks.sendMessageStreaming).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('- qa_engineer: Maya Manager (QA Engineer)'),
      }),
    )
    expect(chatApiMocks.fetchMessages).toHaveBeenCalledWith('conversation-1', { limit: 20 })
    expect(result).toEqual(insights)
  })
})
