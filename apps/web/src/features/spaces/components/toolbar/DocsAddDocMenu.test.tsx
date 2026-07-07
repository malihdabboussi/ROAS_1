import { createRef, type ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DocsAddDocMenu } from './DocsAddDocMenu'

const storeState = {
  activeSpaceId: 'space-1',
}

vi.mock('../../store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

vi.mock('@/components/media/CloudAttachMenuItems', () => ({
  CloudAttachMenuItems: () => <button role="menuitem">Upload file</button>,
}))

vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: () => null,
}))

vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: () => null,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/features/brain/services/sk.service', () => ({
  extractDocumentText: vi.fn(),
}))

vi.mock('@/features/brain/utils/upload-validation', () => ({
  detectBrainUploadKind: vi.fn(() => 'text'),
  isExtractableBrainUploadKind: vi.fn(() => false),
}))

vi.mock('@/lib/media/presigned-client-upload', () => ({
  presignPutUploadFile: vi.fn(),
}))

const docsCloud = {
  openDrive: vi.fn(),
  openDropbox: vi.fn(),
  setShowDrivePicker: vi.fn(),
  setShowDropboxPicker: vi.fn(),
  showDrivePicker: false,
  showDropboxPicker: false,
}

describe('DocsAddDocMenu', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders a fixed inline menu without the toolbar trigger', () => {
    render(
      <DocsAddDocMenu
        open
        setOpen={vi.fn()}
        rootRef={createRef<HTMLDivElement>()}
        docsCloud={docsCloud as never}
        createItem={vi.fn()}
        trigger="none"
        fixedPosition={{ top: 42, left: 64 }}
        renderCloudModals={false}
      />,
    )

    const menu = screen.getByRole('menu')

    expect(screen.queryByRole('button', { name: /Doc/ })).toBeNull()
    expect(menu.className).toContain('fixed')
    expect(menu.style.top).toBe('42px')
    expect(menu.style.left).toBe('64px')
    expect(screen.queryByRole('menuitem', { name: 'New draft' })).not.toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'New visual doc' })).not.toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Upload file' })).not.toBeNull()
  })
})
