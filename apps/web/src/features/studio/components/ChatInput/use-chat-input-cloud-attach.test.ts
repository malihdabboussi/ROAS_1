import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import { useChatInputCloudAttach } from './use-chat-input-cloud-attach'

vi.mock('@/lib/hooks/use-cloud-attach', () => ({
  useCloudAttach: vi.fn(),
}))

const mockUseCloudAttach = vi.mocked(useCloudAttach)

describe('useChatInputCloudAttach', () => {
  let setShowDrivePicker: ReturnType<typeof vi.fn>
  let setShowDropboxPicker: ReturnType<typeof vi.fn>
  let openDrive: ReturnType<typeof vi.fn>
  let openDropbox: ReturnType<typeof vi.fn>
  let closePlusMenu: ReturnType<typeof vi.fn>
  let handleFileSelect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setShowDrivePicker = vi.fn()
    setShowDropboxPicker = vi.fn()
    openDrive = vi.fn()
    openDropbox = vi.fn()
    closePlusMenu = vi.fn()
    handleFileSelect = vi.fn()
    mockUseCloudAttach.mockReturnValue({
      driveConnected: false,
      dropboxConnected: false,
      refreshConnectionStatus: vi.fn(),
      showDrivePicker: true,
      setShowDrivePicker,
      showDropboxPicker: false,
      setShowDropboxPicker,
      openDrive,
      openDropbox,
    })
  })

  it('configures the shared cloud hook with chat toast copy and plus-menu cleanup', () => {
    const fileInputRef = createRef<HTMLInputElement>()

    renderHook(() =>
      useChatInputCloudAttach({
        fileInputRef,
        closePlusMenu,
        handleFileSelect,
      }),
    )

    expect(mockUseCloudAttach).toHaveBeenCalledWith({
      behavior: 'toast_if_disconnected',
      onBeforeOpen: closePlusMenu,
      onDriveDisconnectedToast: CHAT_TOAST_ERRORS.CLOUD_DRIVE_DISCONNECTED.userMessage,
      onDropboxDisconnectedToast: CHAT_TOAST_ERRORS.CLOUD_DROPBOX_DISCONNECTED.userMessage,
      onDriveStatusErrorToast: CHAT_TOAST_ERRORS.CLOUD_DRIVE_DISCONNECTED.userMessage,
      onDropboxStatusErrorToast: CHAT_TOAST_ERRORS.CLOUD_DROPBOX_DISCONNECTED.userMessage,
    })
  })

  it('clicks the hidden local file input and delegates cloud files to upload selection', () => {
    const fileInputRef = createRef<HTMLInputElement>()
    const input = document.createElement('input')
    input.click = vi.fn()
    fileInputRef.current = input
    const file = new File(['deck'], 'deck.pdf', { type: 'application/pdf' })

    const { result } = renderHook(() =>
      useChatInputCloudAttach({
        fileInputRef,
        closePlusMenu,
        handleFileSelect,
      }),
    )

    act(() => result.current.handleFileButtonClick())
    expect(input.click).toHaveBeenCalled()

    act(() => result.current.handleFileFromCloud(file))
    expect(handleFileSelect).toHaveBeenCalledWith([file])
    expect(result.current.openDrive).toBe(openDrive)
    expect(result.current.openDropbox).toBe(openDropbox)
    expect(result.current.showDrivePicker).toBe(true)
    expect(result.current.setShowDrivePicker).toBe(setShowDrivePicker)
    expect(result.current.setShowDropboxPicker).toBe(setShowDropboxPicker)
  })
})
