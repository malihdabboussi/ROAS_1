import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanyCortexSignal } from '@/lib/brain'
import { CompanyCortexSignalsCard } from './CompanyCortexSignalsCard'

const mocks = vi.hoisted(() => ({
  fetchCompanyCortexSignals: vi.fn(),
  reviewCompanyCortexSignal: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/brain', () => ({
  fetchCompanyCortexSignals: mocks.fetchCompanyCortexSignals,
  reviewCompanyCortexSignal: mocks.reviewCompanyCortexSignal,
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

function companySignal(overrides: Partial<CompanyCortexSignal> = {}): CompanyCortexSignal {
  return {
    id: 'signal-1',
    org_id: 'org-1',
    brain_id: 'brain-1',
    signal_type: 'operating_principle',
    truth: 'Support escalations should include customer impact evidence.',
    scope: {},
    evidence_refs: [{ type: 'support_ticket', id: 'ticket-1' }],
    confidence: 0.82,
    confidence_basis: {},
    reason: 'Repeated in support review.',
    context_form: 'When triaging support issues',
    status: 'proposed',
    source: 'daily_dream',
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_note: null,
    created_at: '2026-06-24T10:00:00Z',
    updated_at: '2026-06-24T10:00:00Z',
    ...overrides,
  }
}

describe('CompanyCortexSignalsCard', () => {
  beforeEach(() => {
    mocks.fetchCompanyCortexSignals.mockResolvedValue([companySignal()])
    mocks.reviewCompanyCortexSignal.mockResolvedValue({
      success: true,
      signal: { id: 'signal-1', status: 'active' },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('approves a signal through the review client and removes it from the card', async () => {
    render(<CompanyCortexSignalsCard />)

    expect(
      await screen.findByText('Support escalations should include customer impact evidence.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(mocks.reviewCompanyCortexSignal).toHaveBeenCalledWith('signal-1', 'approve')
    })
    await waitFor(() => {
      expect(
        screen.queryByText('Support escalations should include customer impact evidence.'),
      ).toBeNull()
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Company signal approved and queued for formation.',
    )
  })

  it('rejects a signal through the review client and removes it from the card', async () => {
    mocks.reviewCompanyCortexSignal.mockResolvedValue({
      success: true,
      signal: { id: 'signal-1', status: 'rejected' },
    })

    render(<CompanyCortexSignalsCard />)

    expect(
      await screen.findByText('Support escalations should include customer impact evidence.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => {
      expect(mocks.reviewCompanyCortexSignal).toHaveBeenCalledWith('signal-1', 'reject')
    })
    await waitFor(() => {
      expect(
        screen.queryByText('Support escalations should include customer impact evidence.'),
      ).toBeNull()
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Company signal rejected.')
  })
})
