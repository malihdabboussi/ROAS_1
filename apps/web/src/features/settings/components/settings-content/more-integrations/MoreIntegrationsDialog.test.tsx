import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MoreIntegrationsDialog } from './MoreIntegrationsDialog'

const createNoteTakerDefinition = vi.fn()
const previewNoteTakerDefinition = vi.fn()

vi.mock('@/lib/integrations/meeting-provider-definitions', () => ({
  createNoteTakerDefinition: (...args: unknown[]) => createNoteTakerDefinition(...args),
  previewNoteTakerDefinition: (...args: unknown[]) => previewNoteTakerDefinition(...args),
}))

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
}

describe('MoreIntegrationsDialog', () => {
  beforeEach(() => {
    createNoteTakerDefinition.mockReset()
    previewNoteTakerDefinition.mockReset()
  })
  afterEach(() => cleanup())

  it('shows every integration type, with only Note taker clickable', () => {
    render(<MoreIntegrationsDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />)
    const cards = screen.getByTestId('integration-type-cards')
    const buttons = cards.querySelectorAll('button')
    expect(buttons).toHaveLength(9)
    expect(screen.getByRole('button', { name: 'Note taker' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Social media' })).toBeDisabled()
    expect(screen.getAllByText('Coming soon')).toHaveLength(8)
  })

  it('opens the note-taker form, validates, previews and saves', async () => {
    const onCreated = vi.fn()
    const onOpenChange = vi.fn()
    createNoteTakerDefinition.mockResolvedValue({ slug: 'nt_otter', displayName: 'Otter' })
    previewNoteTakerDefinition.mockResolvedValue({
      ok: true,
      slug: 'nt_otter',
      result: {
        externalId: 'm1',
        title: 'Sync',
        recordingStart: null,
        recordingEnd: null,
        hostEmail: null,
        participantEmails: [],
        transcriptTurns: 1,
        firstTurn: { speakerName: 'Ana', text: 'Hello' },
        actions: [],
        summaryPreview: null,
        sourceUrl: null,
      },
    })
    render(<MoreIntegrationsDialog open onOpenChange={onOpenChange} onCreated={onCreated} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note taker' }))
    expect(screen.getByText('Add a note taker')).toBeTruthy()

    // Saving with nothing filled in reports the problems and does not call the API.
    fireEvent.click(screen.getByRole('button', { name: 'Save note taker' }))
    expect(await screen.findByText('Give the tool a name')).toBeTruthy()
    expect(
      screen.getByText('Some fields need attention. Check the highlighted fields.'),
    ).toBeTruthy()
    expect(document.activeElement?.id).toBe('nt-displayName')
    expect(createNoteTakerDefinition).not.toHaveBeenCalled()

    type(/^Name/, 'Otter')
    type('Header that carries the signature', 'X-Otter-Signature')
    type('Meeting id', 'meeting.id')
    type('List of transcript turns', 'meeting.turns[]')
    type('Text inside each turn', 'text')

    fireEvent.change(screen.getByLabelText('Sample delivery JSON'), {
      target: { value: '{"meeting":{"id":"m1","turns":[{"text":"Hello"}]}}' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Test mapping' }))
    await waitFor(() => expect(screen.getByTestId('preview-result')).toBeTruthy())
    expect(previewNoteTakerDefinition).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Otter' }),
      { meeting: { id: 'm1', turns: [{ text: 'Hello' }] } },
    )
    expect(screen.getByText('Ana: Hello')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Save note taker' }))
    await waitFor(() => expect(createNoteTakerDefinition).toHaveBeenCalledTimes(1))
    expect(createNoteTakerDefinition.mock.calls[0]![0]).toMatchObject({
      displayName: 'Otter',
      signature: { scheme: 'hmac_sha256', header: 'X-Otter-Signature' },
      fieldMap: { externalId: 'meeting.id', transcript: { path: 'meeting.turns[]', text: 'text' } },
    })
    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({ slug: 'nt_otter', displayName: 'Otter' }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows the API error when saving fails', async () => {
    createNoteTakerDefinition.mockRejectedValue(
      new Error('A note taker named "Otter" already exists'),
    )
    render(<MoreIntegrationsDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note taker' }))
    type(/^Name/, 'Otter')
    type('Header that carries the signature', 'X-Sig')
    type('Meeting id', 'id')
    type('List of transcript turns', 'turns[]')
    type('Text inside each turn', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Save note taker' }))
    expect(await screen.findByText('A note taker named "Otter" already exists')).toBeTruthy()
  })
})
