import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WorkspaceSettingsModalProvider,
  useWorkspaceSettingsModal,
} from '@/lib/settings/workspace-settings-modal-context'
import { ComposerModelPicker } from '@/components/chat/model-picker/ComposerModelPicker'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'

afterEach(cleanup)

function modelOption(overrides: Partial<LlmModelOption> = {}): LlmModelOption {
  return {
    id: 'anthropic/claude-sonnet',
    provider: 'anthropic',
    modelName: 'claude-sonnet',
    label: 'Claude Sonnet',
    contextWindow: 200_000,
    maxOutputTokens: null,
    supportsImages: true,
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    supportedParameters: [],
    contextOptions: [
      { tokens: 200_000, label: '200k' },
      { tokens: 1_000_000, label: '1M', pricingProfile: 'extended' },
    ],
    reasoningLevels: ['none', 'medium', 'high'],
    speedModes: ['standard', 'fast'],
    pricing: {},
    pricingTiers: [],
    ...overrides,
  }
}

function WorkspaceModalStatus() {
  const { isOpen, initialSection } = useWorkspaceSettingsModal()
  return <span data-testid="workspace-settings-status">{isOpen ? initialSection : 'closed'}</span>
}

function renderPicker({
  value = { modelId: 'auto', modelSettings: null },
  modelOptions = [
    modelOption(),
    modelOption({
      id: 'openai/gpt-mini',
      provider: 'openai',
      modelName: 'gpt-mini',
      label: 'GPT Mini',
      contextOptions: [{ tokens: 128_000, label: '128k' }],
      reasoningLevels: ['none'],
      speedModes: ['standard'],
    }),
  ],
  onChange = vi.fn(),
}: {
  value?: { modelId: string; modelSettings: ChatModelSettings | null }
  modelOptions?: LlmModelOption[]
  onChange?: ReturnType<typeof vi.fn>
} = {}) {
  const result = render(
    <WorkspaceSettingsModalProvider>
      <ComposerModelPicker modelOptions={modelOptions} value={value} onChange={onChange} />
      <WorkspaceModalStatus />
    </WorkspaceSettingsModalProvider>,
  )
  return { onChange, ...result }
}

describe('ComposerModelPicker', () => {
  it('renders strategies and models, delegates selection, and opens workspace model settings', async () => {
    const { onChange } = renderPicker()

    fireEvent.click(screen.getByRole('button', { name: /auto/i }))

    expect(screen.getByRole('button', { name: /economy/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /claude sonnet/i })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /power/i }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ modelId: 'auto:power', modelSettings: null }),
    )

    fireEvent.click(screen.getByRole('button', { name: /auto/i }))
    fireEvent.click(screen.getByRole('button', { name: /add models/i }))

    expect(screen.getByTestId('workspace-settings-status').textContent).toBe('models')
  })

  it('keeps editable model settings behavior when context, reasoning, and fast mode change', async () => {
    const { onChange } = renderPicker({
      value: {
        modelId: 'anthropic/claude-sonnet',
        modelSettings: {
          context_window_tokens: 200_000,
          reasoning_effort: 'none',
          speed_mode: 'standard',
        },
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /claude sonnet/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    const fastModeRow = screen.getByText('Fast mode').closest('div')
    expect(fastModeRow).toBeTruthy()
    fireEvent.click(within(fastModeRow!).getByRole('switch'))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        modelId: 'anthropic/claude-sonnet',
        modelSettings: {
          context_window_tokens: 200_000,
          reasoning_effort: 'none',
          speed_mode: 'fast',
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /1M/i }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        modelId: 'anthropic/claude-sonnet',
        modelSettings: {
          context_window_tokens: 1_000_000,
          reasoning_effort: 'none',
          speed_mode: 'fast',
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /High More cost/i }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        modelId: 'anthropic/claude-sonnet',
        modelSettings: {
          context_window_tokens: 1_000_000,
          reasoning_effort: 'high',
          speed_mode: 'fast',
        },
      }),
    )
  })

  it('closes after selecting a subscription model', async () => {
    const subscriptionModel = modelOption({
      id: 'openai-codex/gpt-5.5',
      provider: 'openai-codex',
      modelName: 'gpt-5.5',
      label: 'OpenAI Subscription GPT-5.5',
      billingSource: 'subscription',
      contextOptions: [
        { tokens: 272_000, label: '272K' },
        { tokens: 1_000_000, label: '1M', pricingProfile: 'extended' },
      ],
      reasoningLevels: ['none', 'low', 'medium', 'high', 'xhigh'],
      speedModes: ['standard'],
    })
    const { onChange } = renderPicker({
      value: {
        modelId: 'auto',
        modelSettings: null,
      },
      modelOptions: [subscriptionModel],
    })

    fireEvent.click(screen.getByRole('button', { name: /auto/i }))
    fireEvent.mouseEnter(screen.getByRole('button', { name: /openai subscription/i }))
    const submenu = document.querySelector('[data-model-dropdown-portal]')
    expect(submenu).toBeTruthy()
    fireEvent.click(within(submenu as HTMLElement).getByRole('button', { name: /272K/i }))

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        modelId: 'openai-codex/gpt-5.5',
        modelSettings: {
          context_window_tokens: 272_000,
          reasoning_effort: 'none',
          speed_mode: 'standard',
        },
      }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /openai subscription/i })).toBeNull(),
    )
  })

  it('clears the strategy hover card when hovering subscription models', async () => {
    const subscriptionModel = modelOption({
      id: 'openai-codex/gpt-5.5',
      provider: 'openai-codex',
      modelName: 'gpt-5.5',
      label: 'OpenAI Subscription GPT-5.5',
      billingSource: 'subscription',
    })
    renderPicker({ modelOptions: [subscriptionModel] })

    fireEvent.click(screen.getByRole('button', { name: /auto/i }))
    fireEvent.mouseEnter(screen.getByRole('button', { name: /power/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/using the current task, context, and cost profile/i),
      ).toBeTruthy(),
    )

    fireEvent.mouseEnter(screen.getByRole('button', { name: /openai subscription/i }))

    await waitFor(() =>
      expect(
        screen.queryByText(/using the current task, context, and cost profile/i),
      ).toBeNull(),
    )
  })

  it('consumes the first outside click while closing the dropdown', async () => {
    const rowClick = vi.fn()

    render(
      <WorkspaceSettingsModalProvider>
        <div data-testid="agent-row" onClick={rowClick}>
          <ComposerModelPicker
            modelOptions={[modelOption()]}
            value={{ modelId: 'auto', modelSettings: null }}
            onChange={vi.fn()}
          />
        </div>
      </WorkspaceSettingsModalProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /auto/i }))
    expect(screen.getByRole('button', { name: /economy/i })).toBeTruthy()

    const row = screen.getByTestId('agent-row')
    fireEvent.mouseDown(row)
    fireEvent.click(row)

    await waitFor(() => expect(screen.queryByRole('button', { name: /economy/i })).toBeNull())
    expect(rowClick).not.toHaveBeenCalled()

    fireEvent.click(row)
    expect(rowClick).toHaveBeenCalledTimes(1)
  })
})
