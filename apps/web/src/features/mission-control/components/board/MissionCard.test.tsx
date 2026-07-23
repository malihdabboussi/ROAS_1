import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Mission } from '../../types'
import { MissionCard } from './MissionCard'

const mission = {
  id: 'mission-1',
  title: 'Review launch brief',
  priority: 'high',
  status: 'todo',
  progress_notes: null,
  assigned_agent_key: null,
  subtask_agent_keys: [],
} as unknown as Mission

describe('MissionCard', () => {
  it('uses a native button so keyboard users can open the mission', () => {
    const onClick = vi.fn()
    render(<MissionCard mission={mission} onClick={onClick} />)

    const card = screen.getByRole('button', { name: /Review launch brief/i })
    card.focus()
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.click(card)

    expect(card).toHaveFocus()
    expect(onClick).toHaveBeenCalledOnce()
  })
})
