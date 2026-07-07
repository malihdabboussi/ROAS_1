import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fakeClipboardTextOnly,
  fakeClipboardWithImageFiles,
} from '../../../../../tests/clipboard-test-helpers'
import type { MissionAgent, MissionLog } from '../../types'
import { ActivityTimeline } from './ActivityTimeline'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ActivityTimeline comment composer', () => {
  it('calls onPasteFiles with clipboard images when provided', () => {
    const onPasteFiles = vi.fn()
    const fileInputRef = createRef<HTMLInputElement>()
    render(
      <ActivityTimeline
        logsLoading={false}
        isMissionLinked
        sortedLogs={[]}
        subtasks={[]}
        agents={[]}
        userProfile={{ fullName: 'You', avatarUrl: null }}
        createdAt={new Date().toISOString()}
        commentText=""
        sendingComment={false}
        onCommentChange={vi.fn()}
        onCommentSend={vi.fn()}
        activityEndRef={createRef()}
        className="flex min-h-0 flex-1 flex-col"
        fileInputRef={fileInputRef}
        acceptedTypes="*/*"
        onFileSelect={vi.fn()}
        onPasteFiles={onPasteFiles}
      />,
    )
    const textarea = screen.getByPlaceholderText('Send a message...')
    const file = new File(['z'], 'clip.jpg', { type: 'image/jpeg' })
    fireEvent.paste(textarea, { clipboardData: fakeClipboardWithImageFiles([file]) })
    expect(onPasteFiles).toHaveBeenCalledTimes(1)
    const passed = onPasteFiles.mock.calls[0]![0] as File[]
    expect(passed).toHaveLength(1)
    expect(passed[0]!.name).toBe('clip.jpg')
  })

  it('does not call onPasteFiles when clipboard has no images', () => {
    const onPasteFiles = vi.fn()
    const fileInputRef = createRef<HTMLInputElement>()
    render(
      <ActivityTimeline
        logsLoading={false}
        isMissionLinked
        sortedLogs={[]}
        subtasks={[]}
        agents={[]}
        userProfile={{ fullName: 'You', avatarUrl: null }}
        createdAt={new Date().toISOString()}
        commentText=""
        sendingComment={false}
        onCommentChange={vi.fn()}
        onCommentSend={vi.fn()}
        activityEndRef={createRef()}
        className="flex min-h-0 flex-1 flex-col"
        fileInputRef={fileInputRef}
        acceptedTypes="*/*"
        onFileSelect={vi.fn()}
        onPasteFiles={onPasteFiles}
      />,
    )
    const textarea = screen.getByPlaceholderText('Send a message...')
    fireEvent.paste(textarea, { clipboardData: fakeClipboardTextOnly() })
    expect(onPasteFiles).not.toHaveBeenCalled()
  })

  it('renders progress activity with agent metadata', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    const logs: MissionLog[] = [
      {
        id: 'log-1',
        mission_id: 'mission-1',
        user_id: 'user-1',
        event_type: 'mission.progress',
        from_status: null,
        to_status: null,
        agent_key: 'atlas',
        correlation_id: null,
        payload: { note: 'Building launch plan' },
        created_at: new Date().toISOString(),
      },
    ]
    const agents: MissionAgent[] = [
      {
        id: 'agent-1',
        user_id: 'user-1',
        agent_key: 'atlas',
        name: 'Atlas',
        role: 'Strategist',
        status: 'online',
        skills: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    render(
      <ActivityTimeline
        logsLoading={false}
        isMissionLinked
        sortedLogs={logs}
        subtasks={[]}
        agents={agents}
        userProfile={{ fullName: 'You', avatarUrl: null }}
        createdAt={new Date().toISOString()}
        commentText=""
        sendingComment={false}
        onCommentChange={vi.fn()}
        onCommentSend={vi.fn()}
        activityEndRef={createRef()}
        className="flex min-h-0 flex-1 flex-col"
      />,
    )

    expect(screen.getByText('Building launch plan')).toBeTruthy()
    expect(screen.getByText('Atlas')).toBeTruthy()
  })
})
