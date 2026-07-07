import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fakeClipboardTextOnly,
  fakeClipboardWithImageFiles,
} from '../../../../tests/clipboard-test-helpers'
import { MISSION_QUICK_CAPTURE_ACCEPT } from '@/lib/chat/chat-toast-errors.config'
import { MissionQuickCapture } from './MissionQuickCapture'

afterEach(() => {
  cleanup()
})

describe('MissionQuickCapture', () => {
  it('sets file input accept to mission quick capture policy (chat types + spreadsheets)', () => {
    render(
      <MissionQuickCapture
        value=""
        priority="medium"
        campaigns={[{ id: 'c1', name: 'C1' }]}
        selectedCampaignId="c1"
        files={[]}
        onChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onCampaignChange={vi.fn()}
        onFilesChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(input?.getAttribute('accept')).toBe(MISSION_QUICK_CAPTURE_ACCEPT)
  })

  it('does not append pasted clipboard images (textarea has no onPaste handler)', () => {
    const onFilesChange = vi.fn()
    render(
      <MissionQuickCapture
        value=""
        priority="medium"
        campaigns={[{ id: 'c1', name: 'C1' }]}
        selectedCampaignId="c1"
        files={[]}
        onChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onCampaignChange={vi.fn()}
        onFilesChange={onFilesChange}
        onSubmit={vi.fn()}
      />,
    )
    const textarea = screen.getByPlaceholderText('Tell me what to run...')
    const file = new File(['x'], 'paste.png', { type: 'image/png' })
    fireEvent.paste(textarea, { clipboardData: fakeClipboardWithImageFiles([file]) })
    expect(onFilesChange).not.toHaveBeenCalled()
  })

  it('hides campaign selector when hideCampaignSelector is true', () => {
    render(
      <MissionQuickCapture
        value=""
        priority="medium"
        campaigns={[{ id: 'c1', name: 'My Campaign' }]}
        selectedCampaignId="c1"
        files={[]}
        hideCampaignSelector
        onChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onCampaignChange={vi.fn()}
        onFilesChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.queryByText('My Campaign')).toBeNull()
  })

  it('modern composer uses plus attach and hides char count when configured', () => {
    render(
      <MissionQuickCapture
        value=""
        priority="medium"
        campaigns={[{ id: 'c1', name: 'C1' }]}
        selectedCampaignId="c1"
        files={[]}
        composerVariant="modern"
        hideCharCount
        hidePrioritySelector
        hideCampaignSelector
        onChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onCampaignChange={vi.fn()}
        onFilesChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Add files')).toBeDefined()
    expect(screen.queryByText(/10,000/)).toBeNull()
  })

  it('does not intercept paste when only text is on the clipboard', () => {
    const onFilesChange = vi.fn()
    const onChange = vi.fn()
    render(
      <MissionQuickCapture
        value=""
        priority="medium"
        campaigns={[{ id: 'c1', name: 'C1' }]}
        selectedCampaignId="c1"
        files={[]}
        onChange={onChange}
        onPriorityChange={vi.fn()}
        onCampaignChange={vi.fn()}
        onFilesChange={onFilesChange}
        onSubmit={vi.fn()}
      />,
    )
    const textarea = screen.getByPlaceholderText('Tell me what to run...') as HTMLTextAreaElement
    fireEvent.paste(textarea, { clipboardData: fakeClipboardTextOnly() })
    expect(onFilesChange).not.toHaveBeenCalled()
  })
})
