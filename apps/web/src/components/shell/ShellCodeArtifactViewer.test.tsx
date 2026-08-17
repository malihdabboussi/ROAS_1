import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { ShellCodeArtifactViewer } from './ShellCodeArtifactViewer'
import { useShellStore } from './use-shell-store'

vi.mock('@/components/ui/HtmlMiniIframe', () => ({
  HtmlMiniIframe: ({ html, title }: { html: string; title: string }) => (
    <iframe data-testid="code-preview" title={title} srcDoc={html} />
  ),
}))

const { downloadChatCodeArtifact } = vi.hoisted(() => ({
  downloadChatCodeArtifact: vi.fn(),
}))

vi.mock('@/lib/chat/chat-code-artifact', async () => {
  const actual = await vi.importActual<typeof import('@/lib/chat/chat-code-artifact')>(
    '@/lib/chat/chat-code-artifact',
  )
  return {
    ...actual,
    downloadChatCodeArtifact,
  }
})

const target: ShellArtifactViewerTarget = {
  id: 'code:html:1',
  title: 'VIP progress',
  type: 'doc',
  content: '<div class="vip-progress">Step 2 of 3</div>',
  mimeType: 'text/html',
}

describe('ShellCodeArtifactViewer', () => {
  beforeEach(() => {
    downloadChatCodeArtifact.mockClear()
    useShellStore.setState({ artifactViewer: { target, width: 480 } })
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(cleanup)

  it('defaults to preview and switches to the code view', () => {
    render(<ShellCodeArtifactViewer target={target} />)

    expect(screen.getByTestId('code-preview')).toBeTruthy()
    expect(screen.getByText('VIP progress')).toBeTruthy()
    expect(screen.getByText('· HTML')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'View the code' }))

    expect(screen.queryByTestId('code-preview')).toBeNull()
    expect(screen.getByText('<div class="vip-progress">Step 2 of 3</div>')).toBeTruthy()
  })

  it('copies code and downloads html from the toolbar menu', () => {
    render(<ShellCodeArtifactViewer target={target} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(target.content)

    fireEvent.click(screen.getByRole('button', { name: 'More copy actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download as HTML' }))
    expect(downloadChatCodeArtifact).toHaveBeenCalledWith(target.content, target.title, 'html')
  })
})
