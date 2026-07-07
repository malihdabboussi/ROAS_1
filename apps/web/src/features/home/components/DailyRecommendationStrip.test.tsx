import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompanyCortexSignal } from '@/lib/brain'
import type { SkillRecommendation } from '@/lib/skill-recommendations'
import { DailyRecommendationStrip } from './DailyRecommendationStrip'

const mocks = vi.hoisted(() => ({
  applySkillRecommendation: vi.fn(),
  evaluateSkillRecommendationExperiment: vi.fn(),
  fetchCompanyCortexSignals: vi.fn(),
  fetchDailyRecommendation: vi.fn(),
  fetchSkillRecommendationHome: vi.fn(),
  reviewCompanyCortexSignal: vi.fn(),
  setCustomerBrainEnabled: vi.fn(),
  toggleCortexMax: vi.fn(),
  updateCompanyCortexSettings: vi.fn(),
  updateSkillRecommendationStatus: vi.fn(),
  updateSkillRecommendationSettings: vi.fn(),
  toastError: vi.fn(),
  toastMessage: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/brain', () => ({
  fetchCompanyCortexSignals: mocks.fetchCompanyCortexSignals,
  reviewCompanyCortexSignal: mocks.reviewCompanyCortexSignal,
  setCustomerBrainEnabled: mocks.setCustomerBrainEnabled,
  toggleCortexMax: mocks.toggleCortexMax,
  updateCompanyCortexSettings: mocks.updateCompanyCortexSettings,
}))

vi.mock('@/lib/skill-recommendations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/skill-recommendations')>(
    '@/lib/skill-recommendations',
  )
  return {
    ...actual,
    applySkillRecommendation: mocks.applySkillRecommendation,
    evaluateSkillRecommendationExperiment: mocks.evaluateSkillRecommendationExperiment,
    fetchSkillRecommendationHome: mocks.fetchSkillRecommendationHome,
    updateSkillRecommendationSettings: mocks.updateSkillRecommendationSettings,
    updateSkillRecommendationStatus: mocks.updateSkillRecommendationStatus,
  }
})

vi.mock('@/features/home/services/daily-recommendation.service', () => ({
  fetchDailyRecommendation: mocks.fetchDailyRecommendation,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/lib/settings', () => ({
  useAccountSettingsModal: () => ({ openAccountSettings: vi.fn() }),
  useWorkspaceSettingsModal: () => ({ openWorkspaceSettings: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    message: mocks.toastMessage,
    success: mocks.toastSuccess,
  },
}))

function jaimeSuggestion(overrides: Partial<SkillRecommendation> = {}): SkillRecommendation {
  return {
    id: 'rec-1',
    org_id: 'org-1',
    candidate_id: 'candidate-1',
    job_id: 'job-1',
    target_agent_key: 'hr',
    skill_key: 'onboarding-followup',
    name: 'Improve onboarding follow-up',
    description: 'Jaime found repeated onboarding replies that needed the same clarification.',
    markdown_content: '# Onboarding follow-up',
    resources: [
      {
        file_path: 'examples/onboarding-checklist.md',
        content_type: 'text/markdown',
        content: '- Start date\n- Manager\n- Missing documents',
      },
    ],
    evidence_event_ids: ['event-1', 'event-2', 'event-3'],
    workflow_summary: '3 matching HR turns repeated the same onboarding clarification.',
    recommended_actions: ['Create a reusable onboarding follow-up skill.'],
    confidence: 0.91,
    status: 'ready',
    proposal_kind: 'skill_create',
    route_out_type: null,
    customer_visible: true,
    target_artifact_kind: 'skill',
    target_artifact_key: 'onboarding-followup',
    artifact_lock_key: 'org-1:hr:skill:onboarding-followup',
    priority_score: 0.82,
    proposed_patch: {
      markdown_content:
        '# Onboarding follow-up\n\nAsk for the start date, manager, and missing documents.',
    },
    quality_failures: [],
    applied_checkpoint_id: null,
    applied_experiment_id: null,
    applied_at: null,
    applied_by: null,
    created_at: '2026-06-24T10:00:00Z',
    updated_at: '2026-06-24T10:00:00Z',
    ...overrides,
  }
}

function atlasSignal(overrides: Partial<CompanyCortexSignal> = {}): CompanyCortexSignal {
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

describe('DailyRecommendationStrip suggestion review', () => {
  beforeEach(() => {
    mocks.fetchDailyRecommendation.mockResolvedValue({ recommendations: [] })
    mocks.fetchSkillRecommendationHome.mockResolvedValue({
      settings: { enabled: true },
      recommendations: [jaimeSuggestion()],
      pending: [],
    })
    mocks.fetchCompanyCortexSignals.mockResolvedValue([atlasSignal()])
    mocks.applySkillRecommendation.mockResolvedValue({
      recommendation: jaimeSuggestion({ status: 'experiment_running' }),
      checkpoint_id: 'checkpoint-1',
      experiment_id: 'experiment-1',
    })
    mocks.reviewCompanyCortexSignal.mockResolvedValue({
      success: true,
      signal: { id: 'signal-1', status: 'active' },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows Jaime and Atlas suggestions first in the unified For you strip', async () => {
    render(<DailyRecommendationStrip />)

    expect(await screen.findByText('Suggestions are ready for review')).toBeTruthy()
    expect(screen.getByText('Jaime and Atlas found 2 suggestions to review.')).toBeTruthy()
    expect(screen.getAllByText('For you').length).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Review' }))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getAllByText('Improve onboarding follow-up').length).toBeGreaterThan(0)
    expect(
      screen.getByText('Support escalations should include customer impact evidence.'),
    ).toBeTruthy()
    expect(
      screen.getAllByText('3 matching HR turns repeated the same onboarding clarification.').length,
    ).toBeGreaterThan(0)
  })

  it('applies a Jaime suggestion from the review modal', async () => {
    render(<DailyRecommendationStrip />)

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(mocks.applySkillRecommendation).toHaveBeenCalledWith('rec-1')
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Agent improvement applied')
  })

  it('approves an Atlas suggestion from the review modal', async () => {
    render(<DailyRecommendationStrip />)

    fireEvent.click(await screen.findByRole('button', { name: 'Review' }))
    fireEvent.click(screen.getByRole('button', { name: /Support escalations should include/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(mocks.reviewCompanyCortexSignal).toHaveBeenCalledWith('signal-1', 'approve')
    })
    expect(await screen.findByText('Approved')).toBeTruthy()
  })

  it('does not render when there are no suggestions or daily recommendations', async () => {
    mocks.fetchSkillRecommendationHome.mockResolvedValueOnce({
      settings: { enabled: true },
      recommendations: [],
      pending: [],
    })
    mocks.fetchCompanyCortexSignals.mockResolvedValueOnce([])

    const { container } = render(<DailyRecommendationStrip />)

    await waitFor(() => {
      expect(mocks.fetchSkillRecommendationHome).toHaveBeenCalled()
    })
    expect(container.firstChild).toBeNull()
  })
})
