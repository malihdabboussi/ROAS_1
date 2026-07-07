import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HumanDMComposer } from './HumanDMComposer'

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({
    upload: mocks.upload,
  }),
}))

function renderComposer(onSend = vi.fn().mockResolvedValue(undefined)) {
  let commits = 0
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  render(
    <Profiler id="human-dm-composer" onRender={() => commits++}>
      <HumanDMComposer conversationId="dm-1" partnerName="Maya" onSend={onSend} />
    </Profiler>,
  )

  return { onSend, consoleError, getCommits: () => commits }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('HumanDMComposer', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.upload.mockResolvedValue({
      success: true,
      url: 'https://cdn.example.com/uploads/photo.png',
      asset: {
        id: 'asset-1',
        file_path: 'uploads/photo.png',
        file_size: 8,
        mime_type: 'image/png',
        public_url: 'https://cdn.example.com/uploads/photo.png',
      },
    })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sends typed content and settles without render loops', async () => {
    const { onSend, consoleError, getCommits } = renderComposer()

    fireEvent.change(screen.getByPlaceholderText(/Message Maya/), {
      target: { value: 'Hello Maya' },
    })
    fireEvent.click(screen.getByLabelText('Send message'))
    await waitFor(() => expect(onSend).toHaveBeenCalledWith({ content: 'Hello Maya' }))
    await flushAsyncWork()

    const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
      call.some((part) => String(part).includes('Maximum update depth')),
    )
    expect(maximumDepthErrors).toHaveLength(0)
    expect(getCommits()).toBeLessThan(20)
  })

  it('sends uploaded attachment URLs', async () => {
    const { onSend } = renderComposer()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(input).toBeTruthy()

    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    fireEvent.change(input!, { target: { files: [file] } })

    await waitFor(() =>
      expect(mocks.upload).toHaveBeenCalledWith({
        file,
        name: 'photo.png',
        category: 'dm_attachment',
      }),
    )
    await waitFor(() => expect(screen.getByText('photo.png')).toBeTruthy())

    fireEvent.click(screen.getByLabelText('Send message'))
    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith({
        content: '',
        attachments: ['https://cdn.example.com/uploads/photo.png'],
      }),
    )
  })

  it('converts large pasted text into pasted blocks and merges them into the send payload', async () => {
    const { onSend } = renderComposer()
    const largePaste = 'Research note '.repeat(140)
    const input = screen.getByPlaceholderText(/Message Maya/)

    fireEvent.paste(input, {
      clipboardData: {
        items: [],
        getData: (type: string) => (type === 'text/plain' ? largePaste : ''),
      },
    })

    await waitFor(() => expect(screen.getByRole('button', { name: 'View pasted text' })).toBeTruthy())
    fireEvent.change(input, { target: { value: 'Please review this.' } })
    fireEvent.click(screen.getByLabelText('Send message'))

    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith({
        content: `${largePaste.trim()}\n\nPlease review this.`,
      }),
    )
  })
})
