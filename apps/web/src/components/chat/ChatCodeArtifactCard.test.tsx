import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatCodeArtifactCard } from './ChatCodeArtifactCard'

const { openCodeArtifactInShell, downloadChatCodeArtifact } = vi.hoisted(() => ({
  openCodeArtifactInShell: vi.fn(),
  downloadChatCodeArtifact: vi.fn(),
}))

vi.mock('@/lib/chat/chat-code-artifact', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat/chat-code-artifact')>(
    '@/lib/chat/chat-code-artifact',
  )
  return {
    ...actual,
    openCodeArtifactInShell,
    downloadChatCodeArtifact,
  }
})

const CODE = '<!-- VIP progress -->\n<div class="vip-progress">Step 2 of 3</div>'

describe('ChatCodeArtifactCard', () => {
  beforeEach(() => {
    openCodeArtifactInShell.mockClear()
    downloadChatCodeArtifact.mockClear()
  })

  afterEach(cleanup)

  it('opens the shell artifact viewer when the card is clicked', () => {
    render(<ChatCodeArtifactCard title="VIP progress" language="html" code={CODE} />)

    fireEvent.click(screen.getByTestId('chat-code-artifact-card'))

    expect(openCodeArtifactInShell).toHaveBeenCalledWith({
      title: 'VIP progress',
      language: 'html',
      code: CODE,
    })
  })

  it('downloads html from the card without opening the viewer', () => {
    render(<ChatCodeArtifactCard title="VIP progress" language="html" code={CODE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Download as HTML' }))

    expect(downloadChatCodeArtifact).toHaveBeenCalledWith(CODE, 'VIP progress', 'html')
    expect(openCodeArtifactInShell).not.toHaveBeenCalled()
  })
})
