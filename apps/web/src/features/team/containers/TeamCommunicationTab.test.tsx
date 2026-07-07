import { Profiler, useRef, useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import type { AgentChannel } from '../services/channels.service'
import { TeamCommunicationTab } from './TeamCommunicationTab'

const mocks = vi.hoisted(() => ({
  backendPatch: vi.fn(),
  disconnectSlack: vi.fn(),
  disconnectTelegram: vi.fn(),
  setTelegramVisibility: vi.fn(),
  toggleSlackChannel: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => ({
  backendPatch: mocks.backendPatch,
}))

vi.mock('../services/channels.service', () => ({
  disconnectSlack: mocks.disconnectSlack,
  disconnectTelegram: mocks.disconnectTelegram,
  setTelegramVisibility: mocks.setTelegramVisibility,
  toggleSlackChannel: mocks.toggleSlackChannel,
}))

vi.mock('./AgentWidgetSection', () => ({
  AgentWidgetSection: ({ agent }: { agent: MissionAgent }) => (
    <div data-testid="agent-widget-section">Widget for {agent.name}</div>
  ),
}))

const selectedAgent: MissionAgent = {
  id: 'agent-row-1',
  user_id: 'user-1',
  agent_key: 'agent-alpha',
  name: 'Agent Alpha',
  role: 'Operations',
  status: 'online',
  skills: [],
  level: 'c_level',
  image_url: null,
  is_active: true,
  team_id: 'team-growth',
  config: {
    communication_style: 'Professional but approachable, clear communication',
    voice_name: 'Kore',
  },
  created_at: '2026-06-24T00:00:00.000Z',
  updated_at: '2026-06-24T00:00:00.000Z',
}

const initialChannels: AgentChannel[] = [
  {
    id: 'channel-telegram',
    user_id: 'user-1',
    agent_key: 'agent-alpha',
    channel_type: 'telegram',
    provider_config: { bot_username: 'alpha_bot' },
    is_active: true,
    is_public: true,
    last_message_at: null,
    error_message: null,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
  },
  {
    id: 'channel-slack',
    user_id: 'user-1',
    agent_key: 'agent-alpha',
    channel_type: 'slack',
    provider_config: { channel_name: 'ops' },
    is_active: true,
    is_public: false,
    last_message_at: null,
    error_message: null,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
  },
]

function renderCommunicationTab() {
  const handleCommunicationStrategyChange = vi.fn().mockResolvedValue(undefined)
  const handleCommunicationModelChange = vi.fn().mockResolvedValue(undefined)
  const handleVoiceChange = vi.fn().mockResolvedValue(undefined)
  const handleCommunicationStyleChange = vi.fn().mockResolvedValue(undefined)
  const setShowTelegramSetup = vi.fn()
  const setShowSlackSetup = vi.fn()
  const onPublicPageToggle = vi.fn().mockResolvedValue(undefined)
  const onPublicSlugAssign = vi.fn().mockResolvedValue(undefined)
  let commitCount = 0

  function Harness() {
    const modelDropdownRef = useRef<HTMLDivElement | null>(null)
    const modelDropdownBtnRef = useRef<HTMLButtonElement | null>(null)
    const digestDropdownBtnRef = useRef<HTMLButtonElement | null>(null)
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
    const [channels, setChannels] = useState<AgentChannel[]>(initialChannels)
    const [channelDisconnecting, setChannelDisconnecting] = useState(false)
    const [slackDisconnecting, setSlackDisconnecting] = useState(false)
    const [preferredChannel, setPreferredChannel] = useState<'studio' | 'telegram' | 'slack'>(
      'studio',
    )
    const [channelSaving, setChannelSaving] = useState(false)
    const [digestEnabled, setDigestEnabled] = useState(true)
    const [digestSaving, setDigestSaving] = useState(false)
    const [digestTime, setDigestTime] = useState('08:00')
    const [digestDropdownOpen, setDigestDropdownOpen] = useState(false)

    return (
      <Profiler id="team-communication-tab" onRender={() => commitCount++}>
        <TeamCommunicationTab
          selected={selectedAgent}
          selectedModelId="auto"
          modelOptions={[]}
          communicationSaving={false}
          communicationError={null}
          modelDropdownOpen={modelDropdownOpen}
          setModelDropdownOpen={setModelDropdownOpen}
          modelDropdownRef={modelDropdownRef}
          modelDropdownBtnRef={modelDropdownBtnRef}
          modelDropdownPos={{ top: 0, left: 0, width: 240 }}
          handleCommunicationStrategyChange={handleCommunicationStrategyChange}
          handleCommunicationModelChange={handleCommunicationModelChange}
          handleVoiceChange={handleVoiceChange}
          handleCommunicationStyleChange={handleCommunicationStyleChange}
          channelsLoading={false}
          channels={channels}
          setChannels={setChannels}
          channelDisconnecting={channelDisconnecting}
          setChannelDisconnecting={setChannelDisconnecting}
          slackDisconnecting={slackDisconnecting}
          setSlackDisconnecting={setSlackDisconnecting}
          setShowTelegramSetup={setShowTelegramSetup}
          setShowSlackSetup={setShowSlackSetup}
          preferredChannel={preferredChannel}
          setPreferredChannel={setPreferredChannel}
          channelSaving={channelSaving}
          setChannelSaving={setChannelSaving}
          digestEnabled={digestEnabled}
          setDigestEnabled={setDigestEnabled}
          digestSaving={digestSaving}
          setDigestSaving={setDigestSaving}
          digestTime={digestTime}
          setDigestTime={setDigestTime}
          digestDropdownOpen={digestDropdownOpen}
          setDigestDropdownOpen={setDigestDropdownOpen}
          digestDropdownBtnRef={digestDropdownBtnRef}
          digestDropdownPos={{ top: 0, left: 0, width: 160 }}
          userPublicSlug="team"
          onPublicPageToggle={onPublicPageToggle}
          onPublicSlugAssign={onPublicSlugAssign}
        />
      </Profiler>
    )
  }

  const view = render(<Harness />)
  return {
    ...view,
    getCommitCount: () => commitCount,
    handleCommunicationStyleChange,
  }
}

describe('TeamCommunicationTab', () => {
  beforeEach(() => {
    mocks.backendPatch.mockResolvedValue({})
    mocks.disconnectSlack.mockResolvedValue(undefined)
    mocks.disconnectTelegram.mockResolvedValue(undefined)
    mocks.setTelegramVisibility.mockResolvedValue({})
    mocks.toggleSlackChannel.mockResolvedValue({})
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders communication sections, persists existing actions, and settles without render loops', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const { getCommitCount, handleCommunicationStyleChange } = renderCommunicationTab()

      expect(screen.getByText('Model & voice')).toBeTruthy()
      expect(screen.getByText('Communication style')).toBeTruthy()
      expect(screen.getByText('Channels')).toBeTruthy()
      expect(screen.getByText('Daily summary')).toBeTruthy()
      expect(screen.getByText('Website widget')).toBeTruthy()
      expect(screen.getByText('Team Chat')).toBeTruthy()
      expect(screen.getByText('Telegram')).toBeTruthy()
      expect(screen.getByText('Slack')).toBeTruthy()
      expect(screen.getByTestId('agent-widget-section').textContent).toBe('Widget for Agent Alpha')

      fireEvent.click(screen.getByRole('button', { name: 'Bold & Direct' }))
      expect(handleCommunicationStyleChange).toHaveBeenCalledWith(
        'No-nonsense, metric-driven, action-oriented',
      )

      fireEvent.click(screen.getAllByRole('switch')[2]!)

      await waitFor(() => {
        expect(mocks.backendPatch).toHaveBeenCalledWith('/api/missions/profile/settings', {
          daily_digest_enabled: false,
        })
      })

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(getCommitCount()).toBeLessThan(12)
    } finally {
      consoleError.mockRestore()
    }
  })
})
