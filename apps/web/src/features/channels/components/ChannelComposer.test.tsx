import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChannelMember } from '@/lib/channels'
import { ChannelComposer, type ChannelComposerHandle } from './ChannelComposer'

const uploadMock = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())
const openDriveMock = vi.hoisted(() => vi.fn())
const openDropboxMock = vi.hoisted(() => vi.fn())
const fetchAgentSkillsForAgentsMock = vi.hoisted(() => vi.fn())
const originalElementGetClientRects = Element.prototype.getClientRects
const originalRangeGetClientRects = Range.prototype.getClientRects
const originalScrollBy = window.scrollBy

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({ upload: uploadMock }),
}))

vi.mock('@/lib/agents', () => ({
  fetchAgentSkillsForAgents: fetchAgentSkillsForAgentsMock,
}))

vi.mock('@/lib/hooks/use-cloud-attach', () => ({
  useCloudAttach: () => ({
    showDrivePicker: false,
    setShowDrivePicker: vi.fn(),
    showDropboxPicker: false,
    setShowDropboxPicker: vi.fn(),
    openDrive: openDriveMock,
    openDropbox: openDropboxMock,
  }),
}))

vi.mock('@/components/media/CloudAttachMenuItems', () => ({
  CloudAttachMenuItems: ({
    onLocalUpload,
    onDrive,
    onDropbox,
  }: {
    onLocalUpload: () => void
    onDrive: () => void
    onDropbox: () => void
  }) => (
    <>
      <button type="button" onClick={onLocalUpload}>
        Local upload
      </button>
      <button type="button" onClick={onDrive}>
        Add from Google Drive
      </button>
      <button type="button" onClick={onDropbox}>
        Add from Dropbox
      </button>
    </>
  ),
}))

vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: () => null,
}))

vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: () => null,
}))

vi.mock('@/components/ui/media/simple-chat-audio-recorder', () => ({
  SimpleChatAudioRecorder: () => <div data-testid="audio-recorder" />,
}))

vi.mock('./BrandedEmojiPicker', () => ({
  BrandedEmojiPicker: () => <div data-testid="emoji-picker" />,
}))

const members: ChannelMember[] = [
  {
    id: 'member-user',
    channel_id: 'channel-1',
    member_type: 'user',
    user_id: 'user-1',
    agent_key: null,
    role: 'edit',
    added_by: null,
    joined_at: '2026-06-28T10:00:00.000Z',
    created_at: '2026-06-28T10:00:00.000Z',
    profile: {
      id: 'profile-1',
      full_name: 'Jordan Lee',
      avatar_url: null,
    },
  },
]

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChannelComposer>> = {}) {
  return render(
    <ChannelComposer
      channelId="channel-1"
      members={members}
      draftStorageKey="channel-composer-test-draft"
      onSend={vi.fn()}
      {...overrides}
    />,
  )
}

describe('ChannelComposer', () => {
  beforeEach(() => {
    const rects = () =>
      [
        {
          top: 120,
          bottom: 140,
          left: 80,
          right: 320,
          width: 240,
          height: 20,
          x: 80,
          y: 120,
          toJSON: () => ({}),
        } as DOMRect,
      ] as unknown as DOMRectList
    Element.prototype.getClientRects = rects
    Range.prototype.getClientRects = rects
    window.scrollBy = vi.fn()
  })

  afterEach(() => {
    cleanup()
    Element.prototype.getClientRects = originalElementGetClientRects
    Range.prototype.getClientRects = originalRangeGetClientRects
    window.scrollBy = originalScrollBy
    localStorage.clear()
    fetchAgentSkillsForAgentsMock.mockReset()
    vi.clearAllMocks()
  })

  it('tracks empty and non-empty editor state in the send button', async () => {
    const onVisibleStateChange = vi.fn()
    const composerHandleRef = { current: null as ChannelComposerHandle | null }
    renderComposer({ onVisibleStateChange, composerHandleRef })

    const sendButton = await screen.findByRole('button', { name: /Send message/i })
    expect((sendButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTitle('Bold (⌘B)')).toBeTruthy()
    expect(screen.getByLabelText('Mention entity')).toBeTruthy()

    await waitFor(() =>
      expect(onVisibleStateChange).toHaveBeenLastCalledWith({
        text: '',
        attachmentNames: [],
        pastedBlockCount: 0,
        recordingState: 'idle',
        linkInputOpen: false,
        uploadingAttachmentCount: 0,
      }),
    )

    await waitFor(() => expect(composerHandleRef.current).toBeTruthy())
    composerHandleRef.current?.setContent('<p>Browser QA comment</p>')
    await waitFor(() => expect(sendButton.disabled).toBe(false))
  })

  it('uploads selected files and sends their URLs in the payload', async () => {
    uploadMock.mockResolvedValue({ url: 'https://cdn.example.com/brief.txt' })
    const onSend = vi.fn()
    const { container } = renderComposer({ onSend })

    await screen.findByRole('button', { name: /Send message/i })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['brief'], 'brief.txt', { type: 'text/plain' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('brief.txt')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith({
        content: '<p></p>',
        mentions: [],
        attachments: ['https://cdn.example.com/brief.txt'],
        skill_keys: undefined,
      }),
    )
  })

  it('shows the file drop overlay and uploads dropped files without state churn', async () => {
    uploadMock.mockResolvedValue({ url: 'https://cdn.example.com/drop.txt' })
    const { container } = renderComposer()

    await screen.findByRole('button', { name: /Send message/i })
    const dropzone = container.querySelector('[data-dropzone]') as HTMLElement

    fireEvent.dragEnter(dropzone, { dataTransfer: { types: ['Files'] } })
    expect(await screen.findByText('Drop your file')).toBeTruthy()

    const file = new File(['drop'], 'drop.txt', { type: 'text/plain' })
    fireEvent.drop(dropzone, {
      dataTransfer: {
        types: ['Files'],
        files: [file],
        dropEffect: 'none',
      },
    })

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Drop your file')).toBeNull()
    await waitFor(() => expect(screen.getByText('drop.txt')).toBeTruthy())
  })

  it('opens link, attachment, emoji, and voice controls without state churn', async () => {
    const onVisibleStateChange = vi.fn()
    const { container, rerender } = renderComposer({ onVisibleStateChange })

    await screen.findByRole('button', { name: /Send message/i })

    fireEvent.mouseDown(screen.getByTitle('Add link'))
    expect(await screen.findByPlaceholderText('https://…')).toBeTruthy()
    await waitFor(() =>
      expect(onVisibleStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ linkInputOpen: true }),
      ),
    )
    fireEvent.change(screen.getByPlaceholderText('https://…'), {
      target: { value: 'example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByPlaceholderText('https://…')).toBeNull()

    let composerButtons = Array.from(container.querySelectorAll('button'))
    fireEvent.click(composerButtons[9]!)
    expect(await screen.findByText('Local upload')).toBeTruthy()
    fireEvent.click(screen.getByText('Add from Google Drive'))
    expect(openDriveMock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Add from Dropbox'))
    expect(openDropboxMock).toHaveBeenCalledTimes(1)

    composerButtons = Array.from(container.querySelectorAll('button'))
    fireEvent.click(composerButtons[10]!)
    expect(await screen.findByTestId('emoji-picker')).toBeTruthy()

    composerButtons = Array.from(container.querySelectorAll('button'))
    fireEvent.click(composerButtons[12]!)
    expect(await screen.findByTestId('audio-recorder')).toBeTruthy()

    rerender(
      <ChannelComposer
        channelId="channel-1"
        members={members}
        draftStorageKey="channel-composer-test-draft"
        onSend={vi.fn()}
        onVisibleStateChange={onVisibleStateChange}
      />,
    )

    expect(await screen.findByTestId('audio-recorder')).toBeTruthy()
  })

  it('hydrates saved draft content and reports it through visible state', async () => {
    localStorage.setItem('channel-composer-test-draft', '<p>Saved draft</p>')
    const onVisibleStateChange = vi.fn()

    renderComposer({ onVisibleStateChange })

    await waitFor(() =>
      expect(onVisibleStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ text: 'Saved draft' }),
      ),
    )
    expect(await screen.findByRole('button', { name: /Send message/i })).toBeTruthy()
  })

  it('loads scoped slash skills and returns known skill keys in the payload', async () => {
    fetchAgentSkillsForAgentsMock.mockResolvedValue([
      {
        skill_key: 'seo',
        name: 'SEO',
        description: 'Search optimization',
        is_enabled: true,
      },
      {
        skill_key: 'disabled',
        name: 'Disabled',
        description: 'Hidden skill',
        is_enabled: false,
      },
    ])
    const composerHandleRef = { current: null as ChannelComposerHandle | null }

    renderComposer({
      embedded: true,
      composerHandleRef,
      skillAgentKeys: ['zeta', 'alpha', 'zeta', ''],
    })

    await waitFor(() =>
      expect(fetchAgentSkillsForAgentsMock).toHaveBeenCalledWith(['alpha', 'zeta'], {
        summary: true,
      }),
    )
    await waitFor(() => expect(composerHandleRef.current).toBeTruthy())

    composerHandleRef.current?.setContent('<p>/seo and /disabled and /missing</p>')

    await waitFor(() =>
      expect(composerHandleRef.current?.getPayload()).toMatchObject({
        mentions: [],
        skill_keys: ['seo'],
      }),
    )
  })

  it('inserts local people entity mentions and returns them in the payload', async () => {
    const composerHandleRef = { current: null as ChannelComposerHandle | null }

    renderComposer({
      embedded: true,
      composerHandleRef,
      entityMentionPeopleMembers: members,
    })

    await waitFor(() => expect(composerHandleRef.current).toBeTruthy())

    fireEvent.click(screen.getByLabelText('Mention entity'))
    fireEvent.click(await screen.findByRole('button', { name: 'People' }))
    fireEvent.mouseDown(await screen.findByText('Jordan Lee'))

    await waitFor(() =>
      expect(composerHandleRef.current?.getPayload()?.mentions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'person',
            entity_id: 'user-1',
            label: 'Jordan Lee',
          }),
        ]),
      ),
    )
  })

  it('returns member mentions from embedded composer payload text', async () => {
    const composerHandleRef = { current: null as ChannelComposerHandle | null }

    renderComposer({
      embedded: true,
      composerHandleRef,
    })

    await waitFor(() => expect(composerHandleRef.current).toBeTruthy())
    composerHandleRef.current?.setContent('<p>@jordan-lee can you review?</p>')

    await waitFor(() =>
      expect(composerHandleRef.current?.getPayload()?.mentions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'user',
            user_id: 'user-1',
            label: 'Jordan Lee',
          }),
        ]),
      ),
    )
  })

  it('exposes the embedded composer handle without rendering the send button', async () => {
    const composerHandleRef = { current: null as ChannelComposerHandle | null }
    renderComposer({ embedded: true, composerHandleRef })

    await waitFor(() => expect(composerHandleRef.current).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Send message/i })).toBeNull()

    composerHandleRef.current?.setContent('<p>Embedded note</p>')

    await waitFor(() =>
      expect(composerHandleRef.current?.getPayload()).toMatchObject({
        content: '<p>Embedded note</p>',
        mentions: [],
      }),
    )
  })
})
