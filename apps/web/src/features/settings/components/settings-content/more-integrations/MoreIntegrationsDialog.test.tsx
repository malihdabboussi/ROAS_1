import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MoreIntegrationsDialog } from './MoreIntegrationsDialog'

const createNoteTakerDefinition = vi.fn()
const previewNoteTakerDefinition = vi.fn()
const suggestNoteTakerDefinition = vi.fn()
const listNoteTakerTemplates = vi.fn()

vi.mock('@/lib/integrations/meeting-provider-definitions', () => ({
  createNoteTakerDefinition: (...args: unknown[]) => createNoteTakerDefinition(...args),
  previewNoteTakerDefinition: (...args: unknown[]) => previewNoteTakerDefinition(...args),
  suggestNoteTakerDefinition: (...args: unknown[]) => suggestNoteTakerDefinition(...args),
  listNoteTakerTemplates: (...args: unknown[]) => listNoteTakerTemplates(...args),
}))

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
}

describe('MoreIntegrationsDialog', () => {
  beforeEach(() => {
    createNoteTakerDefinition.mockReset()
    previewNoteTakerDefinition.mockReset()
    suggestNoteTakerDefinition.mockReset()
    listNoteTakerTemplates.mockReset()
    listNoteTakerTemplates.mockResolvedValue([
      {
        key: 'generic_turns',
        label: 'Simple: speakers and text',
        description: 'flat',
        definition: {
          signature: {
            scheme: 'hmac_sha256',
            header: 'X-Signature',
            encoding: 'hex',
            keyEncoding: 'utf8',
          },
          event: {},
          fieldMap: { externalId: 'id', transcript: { path: 'transcript[]', text: 'text' } },
        },
      },
    ])
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

  it('fills the paths from a pasted sample and runs the mapping test', async () => {
    suggestNoteTakerDefinition.mockResolvedValue({
      fieldMap: {
        externalId: 'session_id',
        title: 'title',
        transcript: { path: 'transcript.speaker_blocks[]', text: 'words', speaker: 'speaker.name' },
      },
      event: {
        eventTypePath: 'trigger',
        acceptValues: ['meeting_end'],
        deliveryIdPath: 'request_id',
      },
      detected: ['meeting id at session_id', 'transcript turns at transcript.speaker_blocks[]'],
      missing: [],
    })
    previewNoteTakerDefinition.mockResolvedValue({
      ok: true,
      slug: 'nt_x',
      result: {
        externalId: 'S1',
        title: 'Kickoff',
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
    render(<MoreIntegrationsDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note taker' }))
    type(/^Name/, 'Read style')
    type('Header that carries the signature', 'X-Read-Signature')
    fireEvent.change(screen.getByLabelText('Sample delivery JSON'), {
      target: {
        value:
          '{"session_id":"S1","trigger":"meeting_end","request_id":"r1","title":"Kickoff","transcript":{"speaker_blocks":[{"speaker":{"name":"Ana"},"words":"Hello"}]}}',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Detect fields' }))
    await waitFor(() => expect(screen.getByTestId('detection-note')).toBeTruthy())
    expect((screen.getByLabelText(/^Meeting id/) as HTMLInputElement).value).toBe('session_id')
    expect((screen.getByLabelText(/^List of transcript turns/) as HTMLInputElement).value).toBe(
      'transcript.speaker_blocks[]',
    )
    expect((screen.getByLabelText(/^Accepted values/) as HTMLInputElement).value).toBe(
      'meeting_end',
    )
    await waitFor(() => expect(screen.getByTestId('preview-result')).toBeTruthy())
    expect(previewNoteTakerDefinition).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Found: meeting id at session_id/)).toBeTruthy()
  })

  it('applies a template from the dropdown', async () => {
    render(<MoreIntegrationsDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note taker' }))
    const select = await screen.findByLabelText('Start from a template')
    fireEvent.change(select, { target: { value: 'generic_turns' } })
    expect((screen.getByLabelText(/^Meeting id/) as HTMLInputElement).value).toBe('id')
    expect((screen.getByLabelText(/^List of transcript turns/) as HTMLInputElement).value).toBe(
      'transcript[]',
    )
    expect((screen.getByLabelText(/^Header that carries/) as HTMLInputElement).value).toBe(
      'X-Signature',
    )
  })
})
