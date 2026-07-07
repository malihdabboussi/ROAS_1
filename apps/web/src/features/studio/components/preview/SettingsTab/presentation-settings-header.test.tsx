import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import { PresentationSettingsHeader } from './presentation-settings-header'

afterEach(cleanup)

function presentation(overrides: Partial<Presentation> = {}): Presentation {
  return {
    id: 'presentation-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    offer_id: null,
    name: 'Launch Deck',
    slides: [],
    generated_html: null,
    theme_id: null,
    file_url: null,
    status: 'generated',
    slug: 'launch-deck',
    published_url: null,
    domain_id: null,
    hide_branding: false,
    metadata: null,
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('PresentationSettingsHeader', () => {
  it('renders presentation identity, status, saving state, and navigation callbacks', () => {
    const onStartEdit = vi.fn()
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    const onSelectPresentation = vi.fn()

    render(
      <PresentationSettingsHeader
        presentation={presentation()}
        presentationIndex={1}
        presentationsCount={3}
        isSaving={true}
        editingId={null}
        draftName=""
        setDraftName={vi.fn()}
        onStartEdit={onStartEdit}
        onCommitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onPrevious={onPrevious}
        onNext={onNext}
        onSelectPresentation={onSelectPresentation}
        nameInputRef={createRef<HTMLInputElement>()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Launch Deck' }))
    expect(onStartEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'presentation-1' }))
    expect(screen.getByText('Generated')).toBeTruthy()
    expect(screen.getByText('Saving...')).toBeTruthy()
    expect(screen.getByText('2 / 3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Previous presentation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next presentation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show presentation 1' }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onSelectPresentation).toHaveBeenCalledWith(0)
  })

  it('keeps the edit-name branch behavior intact', () => {
    const setDraftName = vi.fn()
    const onCommitEdit = vi.fn().mockResolvedValue(undefined)
    const onCancelEdit = vi.fn()
    const activePresentation = presentation({ status: 'published' })

    render(
      <PresentationSettingsHeader
        presentation={activePresentation}
        presentationIndex={0}
        presentationsCount={1}
        isSaving={false}
        editingId="presentation-1"
        draftName="Draft Deck"
        setDraftName={setDraftName}
        onStartEdit={vi.fn()}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onSelectPresentation={vi.fn()}
        nameInputRef={createRef<HTMLInputElement>()}
      />,
    )

    const input = screen.getByDisplayValue('Draft Deck')
    fireEvent.change(input, { target: { value: 'Renamed Deck' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.blur(input)

    expect(setDraftName).toHaveBeenCalledWith('Renamed Deck')
    expect(onCommitEdit).toHaveBeenCalledWith(activePresentation)
    expect(onCommitEdit).toHaveBeenCalledTimes(2)
    expect(onCancelEdit).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Published')).toBeTruthy()
  })
})
