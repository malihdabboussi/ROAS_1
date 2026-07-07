import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentInfoSkillsTab } from './AgentInfoSkillsTab'

const mocks = vi.hoisted(() => ({
  fetchAgentSkillDenies: vi.fn(),
  setAgentSkillOverride: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
  }),
}))

vi.mock('@/lib/agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents')>()
  return {
    ...actual,
    fetchAgentSkillDenies: mocks.fetchAgentSkillDenies,
    setAgentSkillOverride: mocks.setAgentSkillOverride,
  }
})

const customSkill = {
  id: 'skill-custom',
  user_id: 'user-1',
  agent_key: 'atlas',
  skill_key: 'customer_research',
  name: 'customer_research',
  description: 'Research the customer voice before drafting.',
  markdown_content: '',
  is_enabled: true,
  is_system: false,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-22T10:00:00.000Z',
}

const platformSkill = {
  id: 'skill-platform',
  user_id: null,
  agent_key: 'atlas',
  skill_key: 'system_briefing',
  name: 'system_briefing',
  description: 'Read platform context before taking action.',
  markdown_content: '',
  is_enabled: true,
  is_system: true,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-21T10:00:00.000Z',
}

const workflow = {
  id: 'workflow-1',
  user_id: null,
  agent_key: 'atlas',
  workflow_key: 'launch',
  name: 'Launch Workflow',
  description: 'Run the launch preparation checklist.',
  markdown_content: '',
  steps: [
    { order: 1, name: 'Brief' },
    { order: 2, name: 'Draft' },
  ],
  is_enabled: true,
  archetype_filter: null,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-21T10:00:00.000Z',
}

function renderSkillsTab() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    return (
      <AgentInfoSkillsTab
        skillsLoading={false}
        agentSkills={[customSkill, platformSkill]}
        agentWorkflows={[workflow]}
        skillsError={null}
        selectedAgentKey="atlas"
      />
    )
  }

  const view = render(<Harness />)
  return { ...view, getRenderCount: () => renderCount }
}

describe('AgentInfoSkillsTab', () => {
  beforeEach(() => {
    mocks.fetchAgentSkillDenies.mockResolvedValue(['system_briefing'])
    mocks.setAgentSkillOverride.mockResolvedValue({
      agent_key: 'atlas',
      skill_key: 'system_briefing',
      enabled: true,
    })
    mocks.routerPush.mockReset()
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('loads skill denies, toggles skills, shows peek details, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const { getRenderCount } = renderSkillsTab()

      expect(screen.getByText('Customer Research')).toBeTruthy()
      expect(screen.getByText('System Briefing')).toBeTruthy()
      expect(screen.getByText('Launch Workflow')).toBeTruthy()

      const platformRow = screen.getByText('System Briefing').parentElement
      expect(platformRow).toBeTruthy()
      await waitFor(() => {
        expect(within(platformRow as HTMLElement).getByRole('switch')).toHaveAttribute(
          'aria-checked',
          'false',
        )
      })
      expect(mocks.fetchAgentSkillDenies).toHaveBeenCalledWith('atlas')

      fireEvent.click(within(platformRow as HTMLElement).getByRole('switch'))
      await waitFor(() => {
        expect(mocks.setAgentSkillOverride).toHaveBeenCalledWith('atlas', 'system_briefing', true)
      })

      fireEvent.mouseEnter(screen.getByRole('button', { name: 'Launch Workflow' }))
      expect(await screen.findByText('Run the launch preparation checklist.')).toBeTruthy()
      expect(screen.getByText('/launch')).toBeTruthy()
      expect(screen.getByText('1. Brief')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Manage Skills' }))
      expect(mocks.routerPush).toHaveBeenCalledWith('/team/skills?agent=atlas')

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(getRenderCount()).toBeLessThan(40)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('rolls back optimistic deny state when toggle persistence fails', async () => {
    mocks.setAgentSkillOverride.mockRejectedValueOnce(new Error('nope'))

    renderSkillsTab()

    const customRow = screen.getByText('Customer Research').parentElement
    expect(customRow).toBeTruthy()
    await waitFor(() => {
      expect(within(customRow as HTMLElement).getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })

    fireEvent.click(within(customRow as HTMLElement).getByRole('switch'))

    await waitFor(() => {
      expect(mocks.setAgentSkillOverride).toHaveBeenCalledWith(
        'atlas',
        'customer_research',
        false,
      )
      expect(within(customRow as HTMLElement).getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })
  })
})
