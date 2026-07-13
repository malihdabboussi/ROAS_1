import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import { BrainVisualizationModalLayer } from './BrainVisualizationModalLayer'

vi.mock('./CortexMaxModal', () => ({
  default: ({
    brainId,
    memoryCount,
    onOpenChange,
    open,
    scopeType,
  }: {
    brainId: string | null
    memoryCount: number
    onOpenChange: (open: boolean) => void
    open: boolean
    scopeType?: string
  }) => (
    <div data-testid="cortex-max-modal">
      <span data-testid="cortex-open">{String(open)}</span>
      <span data-testid="cortex-brain-id">{brainId}</span>
      <span data-testid="cortex-memory-count">{memoryCount}</span>
      <span data-testid="cortex-scope-type">{scopeType}</span>
      <button type="button" onClick={() => onOpenChange(false)}>
        Close Cortex
      </button>
    </div>
  ),
}))

vi.mock('./CrystallizeBrainModal', () => ({
  CrystallizeBrainModal: ({
    brainId,
    brainLabel,
    onOpenChange,
    onQueued,
    open,
  }: {
    brainId: string | null
    brainLabel: string
    onOpenChange: (open: boolean) => void
    onQueued?: () => void
    open: boolean
  }) => (
    <div data-testid="crystallize-modal">
      <span data-testid="crystallize-open">{String(open)}</span>
      <span data-testid="crystallize-brain-id">{brainId}</span>
      <span data-testid="crystallize-label">{brainLabel}</span>
      <button type="button" onClick={() => onQueued?.()}>
        Queue crystallize
      </button>
      <button type="button" onClick={() => onOpenChange(false)}>
        Close crystallize
      </button>
    </div>
  ),
}))

function scopeOption(overrides: Partial<BrainScopeNavOption> = {}): BrainScopeNavOption {
  return {
    id: 'user',
    label: 'Your Brain',
    agentId: null,
    brainId: 'brain-user',
    scopeType: 'user',
    ...overrides,
  }
}

function renderLayer(overrides: Partial<Parameters<typeof BrainVisualizationModalLayer>[0]> = {}) {
  const onCortexMaxOpenChange = vi.fn()
  const onCrystallizeOpenChange = vi.fn()
  const onRefreshQueueJobs = vi.fn()
  const props = {
    cortexMaxOpen: true,
    crystallizeOpen: true,
    memoryCount: 7,
    onCortexMaxOpenChange,
    onCrystallizeOpenChange,
    onRefreshQueueJobs,
    selectedScope: scopeOption(),
    topRightScopeReady: true,
    ...overrides,
  }

  return {
    ...render(<BrainVisualizationModalLayer {...props} />),
    onCortexMaxOpenChange,
    onCrystallizeOpenChange,
    onRefreshQueueJobs,
  }
}

describe('BrainVisualizationModalLayer', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
  })

  it('passes Cortex Max props and normalizes campaign-knowledge scope to user scope', () => {
    const { onCortexMaxOpenChange } = renderLayer({
      selectedScope: scopeOption({
        brainId: 'brain-campaign-knowledge',
        id: 'campaign:knowledge',
        label: 'Campaign Knowledge',
        scopeType: 'campaign_knowledge',
      }),
    })

    expect(screen.getByTestId('cortex-open').textContent).toBe('true')
    expect(screen.getByTestId('cortex-brain-id').textContent).toBe('brain-campaign-knowledge')
    expect(screen.getByTestId('cortex-memory-count').textContent).toBe('7')
    expect(screen.getByTestId('cortex-scope-type').textContent).toBe('user')

    fireEvent.click(screen.getByRole('button', { name: 'Close Cortex' }))

    expect(onCortexMaxOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders crystallize only when the ready scope has a brain id and forwards queue refreshes', () => {
    const { onCrystallizeOpenChange, onRefreshQueueJobs, rerender } = renderLayer()

    expect(screen.getByTestId('crystallize-brain-id').textContent).toBe('brain-user')
    expect(screen.getByTestId('crystallize-label').textContent).toBe('Your Brain')

    fireEvent.click(screen.getByRole('button', { name: 'Queue crystallize' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close crystallize' }))

    expect(onRefreshQueueJobs).toHaveBeenCalledTimes(1)
    expect(onCrystallizeOpenChange).toHaveBeenCalledWith(false)

    rerender(
      <BrainVisualizationModalLayer
        cortexMaxOpen={false}
        crystallizeOpen
        memoryCount={0}
        onCortexMaxOpenChange={vi.fn()}
        onCrystallizeOpenChange={vi.fn()}
        onRefreshQueueJobs={vi.fn()}
        selectedScope={scopeOption({ brainId: null })}
        topRightScopeReady
      />,
    )

    expect(screen.queryByTestId('crystallize-modal')).toBeNull()
  })
})
