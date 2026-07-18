import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BRAIN_ADD_AGENT_MODAL_EVENT } from '@/features/brain/lib/brain-agent-modal.events'
import { AddAgentBrainModals } from './AddAgentBrainModals'

vi.mock('@/hooks/use-user-role', () => ({
  useUserRole: () => ({ role: 'member' }),
}))

vi.mock('@/features/brain/hooks/use-brain-scope-nav-options', () => ({
  useBrainScopeNavOptions: () => ({
    agentsWithoutBrain: [
      {
        id: 'agent-1',
        agent_key: 'researcher',
        name: 'Researcher',
        role: 'Research assistant',
        image_url: null,
      },
    ],
    reload: vi.fn(),
  }),
}))

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: { createAgentBrainCheckout: vi.fn() },
}))

describe('AddAgentBrainModals', () => {
  beforeEach(() => sessionStorage.clear())

  it('exposes an accessible add-agent dialog and named icon close control', () => {
    render(<AddAgentBrainModals />)

    act(() => window.dispatchEvent(new Event(BRAIN_ADD_AGENT_MODAL_EVENT)))

    expect(screen.getByRole('dialog', { name: 'Add Agent Brain' })).toHaveAccessibleDescription()
    expect(screen.getByRole('button', { name: 'Close Add Agent Brain' })).toBeInTheDocument()
  })

  it('describes the charge confirmation before activation', () => {
    render(<AddAgentBrainModals />)

    act(() => window.dispatchEvent(new Event(BRAIN_ADD_AGENT_MODAL_EVENT)))
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))

    expect(screen.getByRole('dialog', { name: 'Confirm charge' })).toHaveAccessibleDescription(
      "You will be charged $10/month for Researcher's Agent Brain. Are you sure?",
    )
  })
})
