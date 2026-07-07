import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/react'
import { useChannelComposerSlashMenu } from './use-channel-composer-slash-menu'
import type { SlashSkillEntry } from './use-channel-composer-slash-skills'

function createFakeEditor(textBeforeCursor: string) {
  const chain = {
    focus: vi.fn(() => chain),
    deleteRange: vi.fn(() => chain),
    insertContent: vi.fn(() => chain),
    run: vi.fn(() => true),
  }
  const editor = {
    state: {
      selection: { from: textBeforeCursor.length },
      doc: {
        textBetween: vi.fn(() => textBeforeCursor),
      },
    },
    view: {
      coordsAtPos: vi.fn(() => ({ top: 24, left: 48 })),
    },
    chain: vi.fn(() => chain),
  } as unknown as Editor
  return { editor, chain }
}

function SlashMenuHarness({
  editor,
  skills = [],
  onSetStatus,
}: {
  editor: Editor
  skills?: SlashSkillEntry[]
  onSetStatus?: (status: string) => void
}) {
  const menu = useChannelComposerSlashMenu({
    slashSkillItems: skills,
    commandContext: onSetStatus ? { kind: 'task', onSetStatus } : undefined,
  })
  const { setSlashEditor } = menu

  useEffect(() => {
    setSlashEditor(editor)
  }, [editor, setSlashEditor])

  const visibleItems = menu.slash.items.filter((item) => item.section === menu.slash.section)

  return (
    <div>
      <button type="button" onClick={() => menu.syncSlashMenu(editor)}>
        Sync slash
      </button>
      <span data-testid="active-section">{menu.slash.section}</span>
      {visibleItems.map((item) => (
        <button key={item.id} type="button" onClick={() => menu.runSlashItem(item)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

describe('useChannelComposerSlashMenu', () => {
  afterEach(() => {
    cleanup()
  })

  it('builds task status commands and executes the selected action', async () => {
    const { editor, chain } = createFakeEditor('/')
    const onSetStatus = vi.fn()

    render(<SlashMenuHarness editor={editor} onSetStatus={onSetStatus} />)

    fireEvent.click(screen.getByText('Sync slash'))

    expect(await screen.findByText('Set status: Done')).toBeTruthy()

    fireEvent.click(screen.getByText('Set status: Done'))

    expect(chain.deleteRange).toHaveBeenCalledWith({ from: 0, to: 1 })
    expect(onSetStatus).toHaveBeenCalledWith('done')
  })

  it('builds skill commands and inserts the selected slash skill text', async () => {
    const { editor, chain } = createFakeEditor('/')

    render(
      <SlashMenuHarness
        editor={editor}
        skills={[
          {
            id: 'skill-seo',
            key: 'seo',
            name: 'SEO',
            description: 'Search optimization',
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByText('Sync slash'))

    await waitFor(() => expect(screen.getByTestId('active-section').textContent).toBe('skills'))
    fireEvent.click(await screen.findByText('/seo'))

    expect(chain.deleteRange).toHaveBeenCalledWith({ from: 0, to: 1 })
    expect(chain.insertContent).toHaveBeenCalledWith('/seo ')
  })
})
