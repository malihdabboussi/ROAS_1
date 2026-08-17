import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ALL_TASKS_MESSAGES } from '@/features/all-tasks/config/all-tasks-messages.config'
import { AllTasksBoard } from './AllTasksBoard'

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: vi.fn() }),
  useSearchParams: () => navigation.params,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaigns: vi.fn(async () => []),
}))

vi.mock('@/lib/programs', () => ({
  fetchPrograms: vi.fn(async () => []),
}))

vi.mock('@/lib/work-views', () => ({
  useTaskRollup: () => ({ items: [], loading: false, reload: vi.fn() }),
}))

describe('AllTasksBoard', () => {
  afterEach(() => {
    cleanup()
    navigation.params = new URLSearchParams()
    navigation.replace.mockReset()
  })

  it('defaults to All Tasks instead of the retired My Tasks screen', () => {
    render(<AllTasksBoard />)

    expect(screen.getByRole('button', { name: ALL_TASKS_MESSAGES.allTasks })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: ALL_TASKS_MESSAGES.assignedToMe })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('keeps assigned-to-me as a filter when the URL asks for it', () => {
    navigation.params = new URLSearchParams('scope=my')
    render(<AllTasksBoard />)

    expect(screen.getByRole('button', { name: ALL_TASKS_MESSAGES.assignedToMe })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
