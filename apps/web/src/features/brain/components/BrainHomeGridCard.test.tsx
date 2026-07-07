import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainScopeMenuContext } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import type { BrainHealthData } from '@/features/brain/types'
import { BrainHomeGridCard } from './BrainHomeGridCard'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('./CortexMaxIcon', () => ({
  CortexMaxIcon: () => <span data-testid="cortex-max-icon" />,
}))

function option(overrides: Partial<BrainScopeNavOption> = {}): BrainScopeNavOption {
  return {
    id: 'user',
    label: 'Your Brain',
    agentId: null,
    brainId: 'brain-user',
    scopeType: 'user',
    imageUrl: null,
    ...overrides,
  }
}

function health(overrides: Partial<BrainHealthData> = {}): BrainHealthData {
  return {
    status: 'ok',
    total_memories: 123,
    total_connections: 4,
    embedding_queue: 0,
    last_capture: '2026-06-20T00:00:00.000Z',
    last_recall: null,
    ...overrides,
  }
}

function menuContext(): BrainScopeMenuContext {
  return {
    canTrain: true,
    canAddInfo: false,
    canVoice: true,
    canShare: false,
    canAgentChat: false,
    canManageAgent: false,
    canEnableCustomer: false,
    canDisableCustomer: false,
    canChangeImage: false,
    brainId: 'brain-user',
    brainLabel: 'Your Brain',
    scopeId: 'user',
    onCopyLink: vi.fn(),
    onOpenInNewTab: vi.fn(),
    onOpenBrain: vi.fn(),
    onOpenWithAction: vi.fn(),
    onOpenAgentChat: vi.fn(),
    onManageAgent: vi.fn(),
    onShare: vi.fn(),
    onEnableCustomerBrain: vi.fn(),
    onDisableCustomerBrain: vi.fn(),
  }
}

describe('BrainHomeGridCard', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders metrics and delegates card, quick, and menu actions without render churn', () => {
    const ctx = menuContext()
    const onTrain = vi.fn()
    const onCortexMax = vi.fn()
    const onRender = vi.fn()

    const { rerender } = render(
      <Profiler id="BrainHomeGridCard" onRender={onRender}>
        <BrainHomeGridCard
          option={option()}
          health={health()}
          loading={false}
          imageUrl={null}
          menuContext={ctx}
          canTrain
          onTrain={onTrain}
          onCortexMax={onCortexMax}
        />
      </Profiler>,
    )

    expect(screen.getByText('Your Brain')).toBeTruthy()
    expect(screen.getByText('Memories: 123')).toBeTruthy()
    expect(screen.getByText('Connections: 4')).toBeTruthy()
    expect(screen.getByLabelText('Recent')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /your brain/i }))
    expect(ctx.onOpenBrain).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Train'))
    expect(onTrain).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Cortex MAX'))
    expect(onCortexMax).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('More'))
    fireEvent.click(screen.getByRole('button', { name: 'Open in new tab' }))
    expect(ctx.onOpenInNewTab).toHaveBeenCalledTimes(1)

    rerender(
      <Profiler id="BrainHomeGridCard" onRender={onRender}>
        <BrainHomeGridCard
          option={option()}
          health={health()}
          loading={false}
          imageUrl={null}
          menuContext={ctx}
          canTrain
          onTrain={onTrain}
          onCortexMax={onCortexMax}
        />
      </Profiler>,
    )

    expect(onRender.mock.calls.length).toBeLessThanOrEqual(4)
  })
})
