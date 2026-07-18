import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureUpdate } from '@/features/updates/types'
import { FeatureUpdateDetailModal } from './FeatureUpdateDetailModal'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const update: FeatureUpdate = {
  id: 'update-1',
  title: 'Better campaigns',
  description: 'Create and organize campaign work from one place.',
  video_url: null,
  try_now_path: '/campaigns',
  learn_more_url: null,
  category: 'improvement',
  is_active: true,
  sort_order: 1,
  created_at: '2026-07-17T00:00:00.000Z',
}

describe('FeatureUpdateDetailModal', () => {
  beforeEach(() => {
    push.mockClear()
  })

  it('names and describes the dialog, then navigates from Try Now', () => {
    const onClose = vi.fn()

    render(<FeatureUpdateDetailModal open update={update} onClose={onClose} />)

    expect(screen.getByRole('dialog', { name: update.title })).toHaveAccessibleDescription(
      update.description,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try Now' }))

    expect(push).toHaveBeenCalledWith('/campaigns')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
