import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AvatarPreview } from './AvatarPreview'

const serviceMocks = vi.hoisted(() => ({
  fetchAvatar: vi.fn(),
  updateAvatar: vi.fn(),
}))

const childRenderCounts = vi.hoisted(() => ({
  menu: 0,
}))

vi.mock('../../services/artifact-preview.service', () => serviceMocks)

vi.mock('./StudioAvatarMenuDropdown', () => ({
  StudioAvatarMenuDropdown: () => {
    childRenderCounts.menu += 1
    return <div data-testid="avatar-menu" />
  },
}))

const baseAvatar = {
  id: 'avatar-1',
  user_id: 'user-1',
  campaign_id: 'campaign-1',
  space_id: null,
  offer_id: null,
  name: 'Founder Fiona',
  persona_data: {
    demographics: {
      age: '38',
      location: 'Austin',
      occupation: 'SaaS founder',
      family_status: 'Married, two kids',
    },
    background_profile: 'Built two service businesses before moving into software.',
    comprehensive_summary: 'Needs practical signal before buying another tool.',
    core_problem: ['Too many ideas', 'Not enough time'],
    custom_fields: [{ id: 'field-1', label: 'Buying Trigger', value: 'Missed growth target' }],
  },
  avatar_type: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
}

const updatedAvatar = {
  ...baseAvatar,
  name: 'Founder Frank',
  persona_data: {
    ...baseAvatar.persona_data,
    demographics: {
      ...baseAvatar.persona_data.demographics,
      age: '39',
    },
    custom_fields: [
      { id: 'field-1', label: 'Buying Trigger', value: 'Board pressure' },
      { id: 'field-2', label: 'Favorite Channel', value: 'LinkedIn' },
    ],
  },
}

describe('AvatarPreview', () => {
  beforeEach(() => {
    serviceMocks.fetchAvatar.mockReset()
    serviceMocks.updateAvatar.mockReset()
    childRenderCounts.menu = 0
  })

  afterEach(() => {
    cleanup()
  })

  it('loads, edits, saves, and stays render-stable', async () => {
    let renderCount = 0
    serviceMocks.fetchAvatar.mockResolvedValue(baseAvatar)
    serviceMocks.updateAvatar.mockResolvedValue(updatedAvatar)

    function Harness() {
      renderCount += 1
      return <AvatarPreview avatarId="avatar-1" />
    }

    render(<Harness />)

    expect(await screen.findByText('Founder Fiona')).toBeTruthy()
    expect(screen.getByText('38')).toBeTruthy()
    expect(screen.getByText('SaaS founder')).toBeTruthy()
    expect(screen.getByText('Buying Trigger')).toBeTruthy()
    expect(screen.getByText('Missed growth target')).toBeTruthy()

    fireEvent.click(screen.getByText('Edit'))

    const nameInput = screen.getByLabelText('Avatar name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Founder Frank' } })

    const ageInput = screen.getByLabelText('Age') as HTMLTextAreaElement
    fireEvent.change(ageInput, { target: { value: '39' } })

    fireEvent.click(screen.getByText('Add card'))
    const fieldNames = screen.getAllByLabelText('Custom field name') as HTMLInputElement[]
    const fieldValues = screen.getAllByLabelText('Custom field value') as HTMLTextAreaElement[]
    fireEvent.change(fieldNames[0]!, { target: { value: 'Buying Trigger' } })
    fireEvent.change(fieldValues[0]!, { target: { value: 'Board pressure' } })
    fireEvent.change(fieldNames[1]!, { target: { value: 'Favorite Channel' } })
    fireEvent.change(fieldValues[1]!, { target: { value: 'LinkedIn' } })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(serviceMocks.updateAvatar).toHaveBeenCalledWith('avatar-1', {
        name: 'Founder Frank',
        persona_data: expect.objectContaining({
          demographics: expect.objectContaining({ age: '39' }),
          custom_fields: [
            expect.objectContaining({
              label: 'Buying Trigger',
              value: 'Board pressure',
            }),
            expect.objectContaining({
              label: 'Favorite Channel',
              value: 'LinkedIn',
            }),
          ],
        }),
      })
    })

    expect(await screen.findByText('Founder Frank')).toBeTruthy()
    expect(screen.getByText('Board pressure')).toBeTruthy()
    expect(screen.getByText('Favorite Channel')).toBeTruthy()
    expect(renderCount).toBeLessThan(30)
    expect(childRenderCounts.menu).toBe(0)
  })
})
