import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  hasChatInputSlashCommand,
  renderChatInputHighlightBackdrop,
} from './chat-input-highlight-backdrop'
import type { SlashItem } from './chat-input-slash-menu'

function slashItem(key: string, type: SlashItem['type']): SlashItem {
  return {
    id: key,
    key,
    name: key,
    description: key,
    type,
  }
}

describe('chat-input-highlight-backdrop', () => {
  it('renders known skill commands with the skill highlight class', () => {
    render(<div>{renderChatInputHighlightBackdrop('Run /brief now', [slashItem('brief', 'skill')])}</div>)

    expect(screen.getByText('/brief').className).toBe('slash-skill-highlight')
    expect(screen.getByText('/brief').style.color).toBe('transparent')
    expect(screen.getByText(/Run/)).toBeTruthy()
  })

  it('renders unknown or workflow commands with the command highlight class', () => {
    render(
      <div>
        {renderChatInputHighlightBackdrop('Run /workflow now', [
          slashItem('workflow', 'workflow'),
        ])}
      </div>,
    )

    expect(screen.getByText('/workflow').className).toBe('slash-command-highlight')
  })

  it('detects slash command text without matching plain slashes', () => {
    expect(hasChatInputSlashCommand('Run /brief')).toBe(true)
    expect(hasChatInputSlashCommand('https://example.com/path')).toBe(false)
  })
})
