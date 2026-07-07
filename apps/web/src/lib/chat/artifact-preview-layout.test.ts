import { describe, expect, it } from 'vitest'

import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from './artifact-preview-layout'

describe('artifact preview layout constants', () => {
  it('keeps the chat preview pane height stable', () => {
    expect(ARTIFACT_CHAT_PREVIEW_PANE_PX).toBe(250)
  })
})
