import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentTurnFeedbackActions } from './AgentTurnFeedbackActions'

const apiMocks = vi.hoisted(() => ({
  lookupAgentTurnFeedback: vi.fn(),
  saveAgentTurnFeedback: vi.fn(),
}))

vi.mock('@/lib/agent-feedback/agent-feedback-api', () => apiMocks)

const TARGET_ID = '33333333-3333-4333-8333-333333333333'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('AgentTurnFeedbackActions', () => {
  it('mounts a long chat history without an update-depth error', () => {
    apiMocks.lookupAgentTurnFeedback.mockImplementation(() => new Promise(() => undefined))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <>
        {Array.from({ length: 60 }, (_, index) => (
          <AgentTurnFeedbackActions
            key={index}
            targetKind="conversation_message"
            targetId={`33333333-3333-4333-8333-${String(index).padStart(12, '0')}`}
            sourceSurface="studio_chat"
            content={`Message ${index}`}
          />
        ))}
      </>,
    )

    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('Maximum update depth'))
    consoleError.mockRestore()
  })

  it('renders copy, fork, and thumb actions without a menu button', async () => {
    apiMocks.lookupAgentTurnFeedback.mockResolvedValueOnce({ feedback: [] })
    const onFork = vi.fn()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => undefined) },
    })

    render(
      <AgentTurnFeedbackActions
        targetKind="conversation_message"
        targetId={TARGET_ID}
        sourceSurface="studio_chat"
        content="Ready to help"
        canFork
        onFork={onFork}
      />,
    )

    expect(screen.getByRole('button', { name: /copy message/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /fork chat/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /thumbs up/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /thumbs down/i })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /open message actions/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /copy message/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Ready to help')

    fireEvent.click(screen.getByRole('button', { name: /fork chat/i }))
    expect(onFork).toHaveBeenCalledTimes(1)
  })

  it('saves a thumb vote immediately and opens the detail popover', async () => {
    apiMocks.lookupAgentTurnFeedback.mockResolvedValueOnce({ feedback: [] })
    apiMocks.saveAgentTurnFeedback.mockResolvedValue({
      id: 'feedback-1',
      target_kind: 'conversation_message',
      target_id: TARGET_ID,
      thumbs_up: false,
      tags: [],
      feedback_text: null,
    })

    render(
      <AgentTurnFeedbackActions
        targetKind="conversation_message"
        targetId={TARGET_ID}
        sourceSurface="studio_chat"
        content="Ready to help"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /thumbs down/i }))

    await waitFor(() =>
      expect(apiMocks.saveAgentTurnFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          target_kind: 'conversation_message',
          target_id: TARGET_ID,
          thumbs_up: false,
          tags: [],
          feedback_text: null,
          source_surface: 'studio_chat',
        }),
      ),
    )
    expect(screen.getByRole('dialog', { name: /turn feedback details/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /tool issue/i })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /^helpful$/i })).toBeNull()
  })

  it('shows positive chips for thumbs up and hides negative chips', async () => {
    apiMocks.lookupAgentTurnFeedback.mockResolvedValueOnce({ feedback: [] })
    apiMocks.saveAgentTurnFeedback.mockResolvedValue({
      id: 'feedback-1',
      target_kind: 'conversation_message',
      target_id: TARGET_ID,
      thumbs_up: true,
      tags: [],
      feedback_text: null,
    })

    render(
      <AgentTurnFeedbackActions
        targetKind="conversation_message"
        targetId={TARGET_ID}
        sourceSurface="studio_chat"
        content="Ready to help"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /thumbs up/i }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /turn feedback details/i })).not.toBeNull(),
    )

    expect(screen.getByRole('button', { name: /^helpful$/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /^clear$/i })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /tool issue/i })).toBeNull()
  })

  it('reloads existing selected feedback from lookup', async () => {
    apiMocks.lookupAgentTurnFeedback.mockResolvedValueOnce({
      feedback: [
        {
          target_kind: 'conversation_message',
          target_id: TARGET_ID,
          thumbs_up: true,
          tags: ['helpful'],
          feedback_text: 'Strong answer',
        },
      ],
    })

    render(
      <AgentTurnFeedbackActions
        targetKind="conversation_message"
        targetId={TARGET_ID}
        sourceSurface="studio_chat"
        content="Ready to help"
      />,
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /thumbs up/i }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    )
  })

  it('keeps Save enabled while the initial thumb save is still in flight', async () => {
    apiMocks.lookupAgentTurnFeedback.mockResolvedValueOnce({ feedback: [] })
    let resolveSave: ((value: unknown) => void) | undefined
    apiMocks.saveAgentTurnFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve
        }),
    )

    render(
      <AgentTurnFeedbackActions
        targetKind="conversation_message"
        targetId={TARGET_ID}
        sourceSurface="studio_chat"
        content="Ready to help"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /thumbs up/i }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /turn feedback details/i })).not.toBeNull(),
    )

    const saveButton = screen.getByRole('button', { name: /saving|save/i })
    expect(saveButton.hasAttribute('disabled')).toBe(false)

    fireEvent.change(screen.getByPlaceholderText(/optional note/i), {
      target: { value: 'Needs clearer steps' },
    })
    fireEvent.click(screen.getByRole('button', { name: /helpful/i }))
    fireEvent.click(saveButton)

    await waitFor(() => expect(apiMocks.saveAgentTurnFeedback).toHaveBeenCalledTimes(2))
    expect(apiMocks.saveAgentTurnFeedback).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tags: ['helpful'],
        feedback_text: 'Needs clearer steps',
      }),
    )

    resolveSave?.({
      id: 'feedback-1',
      target_kind: 'conversation_message',
      target_id: TARGET_ID,
      thumbs_up: true,
      tags: ['helpful'],
      feedback_text: 'Needs clearer steps',
    })
  })

  it('keeps chips visible and Save pressable when the background thumb save fails', async () => {
    apiMocks.lookupAgentTurnFeedback.mockResolvedValueOnce({ feedback: [] })
    apiMocks.saveAgentTurnFeedback.mockRejectedValueOnce(new Error('Save failed'))

    render(
      <AgentTurnFeedbackActions
        targetKind="space_item_activity"
        targetId={TARGET_ID}
        sourceSurface="task_activity"
        content="Updated the task"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /thumbs up/i }))

    await waitFor(() =>
      expect(apiMocks.saveAgentTurnFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          target_kind: 'space_item_activity',
          source_surface: 'task_activity',
          thumbs_up: true,
        }),
      ),
    )

    expect(screen.getByRole('button', { name: /^helpful$/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /^clear$/i })).not.toBeNull()
    expect(screen.getByRole('button', { name: /^save$/i }).hasAttribute('disabled')).toBe(false)
  })

  it('keeps the latest detail save when the initial thumb save resolves later', async () => {
    apiMocks.lookupAgentTurnFeedback.mockResolvedValueOnce({ feedback: [] })
    let resolveInitialSave: ((value: unknown) => void) | undefined
    apiMocks.saveAgentTurnFeedback
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitialSave = resolve
          }),
      )
      .mockImplementation(async (payload) => ({
        id: 'feedback-latest',
        ...payload,
      }))

    render(
      <AgentTurnFeedbackActions
        targetKind="conversation_message"
        targetId={TARGET_ID}
        sourceSurface="studio_chat"
        content="Ready to help"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /thumbs up/i }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /turn feedback details/i })).not.toBeNull(),
    )

    fireEvent.click(screen.getByRole('button', { name: /^helpful$/i }))
    fireEvent.change(screen.getByPlaceholderText(/optional note/i), {
      target: { value: 'Keep this detail' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(apiMocks.saveAgentTurnFeedback).toHaveBeenCalledTimes(2))
    expect(apiMocks.saveAgentTurnFeedback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tags: ['helpful'],
        feedback_text: 'Keep this detail',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /close feedback/i }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /turn feedback details/i })).toBeNull(),
    )

    await act(async () => {
      resolveInitialSave?.({
        id: 'feedback-first',
        target_kind: 'conversation_message',
        target_id: TARGET_ID,
        thumbs_up: true,
        tags: [],
        feedback_text: null,
      })
      await Promise.resolve()
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /thumbs up/i }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: /thumbs up/i }))

    await waitFor(() => expect(apiMocks.saveAgentTurnFeedback).toHaveBeenCalledTimes(3))
    expect(apiMocks.saveAgentTurnFeedback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        tags: ['helpful'],
        feedback_text: 'Keep this detail',
      }),
    )
  })
})
