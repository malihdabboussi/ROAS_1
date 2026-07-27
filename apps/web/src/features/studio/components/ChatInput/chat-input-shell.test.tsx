import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputShell } from './chat-input-shell'

vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <button type="button" data-open={String(open)} data-testid="drive-modal" onClick={onClose}>
      drive modal
    </button>
  ),
}))

vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <button type="button" data-open={String(open)} data-testid="dropbox-modal" onClick={onClose}>
      dropbox modal
    </button>
  ),
}))

vi.mock('./chat-input-attachments-area', () => ({
  ChatInputAttachmentsArea: ({
    fileInputAccept,
    onFileSelect,
  }: {
    fileInputAccept: string
    onFileSelect: (files: FileList | null) => void
  }) => (
    <button
      type="button"
      data-accept={fileInputAccept}
      data-testid="attachments-area"
      onClick={() => onFileSelect(null)}
    >
      attachments
    </button>
  ),
}))

vi.mock('./chat-input-slash-menu-portal', () => ({
  ChatInputSlashMenuPortal: ({ open }: { open: boolean }) => (
    <div data-open={String(open)} data-testid="slash-menu" />
  ),
}))

vi.mock('./chat-input-at-mention-menu-portal', () => ({
  ChatInputAtMentionMenuPortal: ({ open }: { open: boolean }) => (
    <div data-open={String(open)} data-testid="at-menu" />
  ),
}))

vi.mock('./chat-input-textarea', () => ({
  ChatInputTextarea: ({ value, disabled }: { value: string; disabled: boolean }) => (
    <textarea data-testid="textarea" disabled={disabled} readOnly value={value} />
  ),
}))

vi.mock('./chat-input-normal-footer', () => ({
  ChatInputNormalFooter: () => <div data-testid="normal-footer" />,
}))

vi.mock('./chat-input-recording-footer', () => ({
  ChatInputRecordingFooter: () => <div data-testid="recording-footer" />,
}))

vi.mock('./chat-input-composer-notices', () => ({
  ChatInputDragOverlay: ({
    wrapperClass,
    roundedClass,
  }: {
    wrapperClass?: string
    roundedClass: string
  }) => (
    <div
      data-rounded-class={roundedClass}
      data-testid="drag-overlay"
      data-wrapper-class={wrapperClass ?? ''}
    />
  ),
}))

afterEach(cleanup)

function defaultProps(
  overrides: Partial<Parameters<typeof ChatInputShell>[0]> = {},
): Parameters<typeof ChatInputShell>[0] {
  const onDriveClose = vi.fn()
  const onDropboxClose = vi.fn()
  const props: Parameters<typeof ChatInputShell>[0] = {
    shellRef: createRef<HTMLDivElement>(),
    roundedClass: 'rounded-2xl',
    onDragEnter: vi.fn(),
    onDragLeave: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    pastedTextControls: (
      <button type="button" data-block-count="1" data-testid="pasted-controls">
        pasted controls
      </button>
    ),
    attachmentsProps: {
      fileInputRef: createRef<HTMLInputElement>(),
      attachedFiles: [],
      attachedArtifacts: [],
      attachedReferences: [],
      creditsExhausted: false,
      composerPadX: 'px-spacing-2',
      composerChipRowPad: 'px-spacing-2 pb-spacing-2',
      onFileSelect: vi.fn(),
      onFileRemove: vi.fn(),
      onArtifactRemove: vi.fn(),
      onReferenceRemove: vi.fn(),
    },
    slashMenuProps: {
      open: false,
      floatingRef: vi.fn(),
      floatingStyles: {},
      portalTarget: null,
      layout: {
        playbookItems: [],
        skillItems: [],
        workflowItems: [],
        playbookVisible: [],
        skillVisible: [],
        workflowVisible: [],
        visibleFlat: [],
        playbookMoreCount: 0,
        skillMoreCount: 0,
        workflowMoreCount: 0,
        showPlaybookMore: false,
        showSkillMore: false,
        showWorkflowMore: false,
      },
      slashItemsCount: 0,
      slashHighlight: 0,
      onSelect: vi.fn(),
      onHighlight: vi.fn(),
      onShowMorePlaybooks: vi.fn(),
      onShowMoreSkills: vi.fn(),
      onShowMoreWorkflows: vi.fn(),
    },
    atMentionMenuProps: {
      open: false,
      portalTarget: null,
      floatingRef: vi.fn(),
      floatingStyles: {},
      composerShellRect: null,
      crossCampaignMode: false,
      activeTab: 'artifacts',
      tabs: [{ id: 'artifacts', label: 'Artifacts' }],
      atQuery: '',
      atHighlight: 0,
      crossCampaignLoading: false,
      atDataLoading: false,
      artifactRows: [],
      mediaRows: [],
      navSlice: { kind: 'items', items: [] },
      showSpaceTaskMore: false,
      showMissionMore: false,
      onBackFromCrossCampaign: vi.fn(),
      onTabChange: vi.fn(),
      onHighlight: vi.fn(),
      onCampaignSelect: vi.fn(),
      onAtSelect: vi.fn(),
      onToggleArtifactCollapsed: vi.fn(),
      onShowAllArtifacts: vi.fn(),
      onToggleMediaCollapsed: vi.fn(),
      onShowAllMedia: vi.fn(),
      onShowMoreSpaceTasks: vi.fn(),
      onShowMoreMissions: vi.fn(),
    },
    textareaProps: {
      textareaRef: createRef<HTMLTextAreaElement>(),
      highlightBackdropRef: createRef<HTMLDivElement>(),
      value: 'Hello shell',
      showHighlight: false,
      renderHighlightBackdrop: vi.fn(),
      composerPadX: 'px-spacing-2',
      compact: false,
      placeholder: 'Message ROAS...',
      disabled: false,
      onFocus: vi.fn(),
      onChange: vi.fn(),
      onKeyDown: vi.fn(),
      onPaste: vi.fn(),
      onSelect: vi.fn(),
      onScroll: vi.fn(),
    },
    footer: {
      kind: 'normal',
      props: { composerPadX: 'px-spacing-2' } as never,
    },
    driveModalProps: {
      open: true,
      onClose: onDriveClose,
      onSelectFileForChat: vi.fn(),
    },
    dropboxModalProps: {
      open: false,
      onClose: onDropboxClose,
      onSelectFileForChat: vi.fn(),
    },
    dragOverlayVisible: true,
    ...overrides,
  }
  return props
}

describe('ChatInputShell', () => {
  it('renders the normal composer shell and delegates root drag events', () => {
    const props = defaultProps()
    const { container } = render(<ChatInputShell {...props} />)
    const root = container.firstElementChild as HTMLElement

    expect(root.className).toContain('input-glass')
    expect(root.className).toContain('rounded-2xl')
    expect(screen.getByTestId('pasted-controls').dataset.blockCount).toBe('1')
    expect(screen.getByTestId('attachments-area').dataset.accept).toContain('.pdf')
    expect(screen.getByTestId('attachments-area').dataset.accept).toContain('.webp')
    expect((screen.getByTestId('textarea') as HTMLTextAreaElement).value).toBe('Hello shell')
    expect(screen.getByTestId('normal-footer')).toBeTruthy()
    expect(screen.queryByTestId('recording-footer')).toBeNull()
    expect(screen.getByTestId('drive-modal').dataset.open).toBe('true')
    expect(screen.getByTestId('dropbox-modal').dataset.open).toBe('false')
    expect(screen.getByTestId('drag-overlay').dataset.roundedClass).toBe('rounded-2xl')

    fireEvent.dragEnter(root)
    fireEvent.dragLeave(root)
    fireEvent.dragOver(root)
    fireEvent.drop(root)

    expect(props.onDragEnter).toHaveBeenCalledTimes(1)
    expect(props.onDragLeave).toHaveBeenCalledTimes(1)
    expect(props.onDragOver).toHaveBeenCalledTimes(1)
    expect(props.onDrop).toHaveBeenCalledTimes(1)
  })

  it('renders wrapper overrides and the recording footer branch', () => {
    const props = defaultProps({
      wrapperClass: 'custom-chat-shell',
      footer: {
        kind: 'recording',
        props: { recordingState: 'recording' } as never,
      },
      dragOverlayVisible: false,
    })
    const { container } = render(<ChatInputShell {...props} />)
    const root = container.firstElementChild as HTMLElement

    expect(root.className).toBe('relative custom-chat-shell')
    expect(screen.getByTestId('recording-footer')).toBeTruthy()
    expect(screen.queryByTestId('normal-footer')).toBeNull()
    expect(screen.queryByTestId('drag-overlay')).toBeNull()
  })
})
