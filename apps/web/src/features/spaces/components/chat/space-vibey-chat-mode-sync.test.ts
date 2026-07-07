import { describe, expect, it } from 'vitest'

import {
  resolveSpaceChatPanelMode,
  resolveSpaceChatSpecialMode,
} from './space-vibey-chat-mode-sync'

describe('resolveSpaceChatSpecialMode', () => {
  it('opens the active specialized mode when its session exists', () => {
    expect(
      resolveSpaceChatSpecialMode({
        mode: 'chat',
        presentationCommentsActive: true,
        hasPresentationCommentsSession: true,
      }),
    ).toBe('presentation-comments')
  })

  it('closes a specialized mode when its active flag or session disappears', () => {
    expect(
      resolveSpaceChatSpecialMode({
        mode: 'presentation-design',
        presentationDesignActive: false,
        hasPresentationDesignSession: true,
      }),
    ).toBe('chat')

    expect(
      resolveSpaceChatSpecialMode({
        mode: 'funnel-tweaks',
        funnelTweaksActive: true,
        hasFunnelTweaksSession: false,
      }),
    ).toBe('chat')
  })

  it('preserves the previous effect order when several specialized modes are active', () => {
    expect(
      resolveSpaceChatSpecialMode({
        mode: 'chat',
        presentationCommentsActive: true,
        hasPresentationCommentsSession: true,
        funnelTweaksActive: true,
        hasFunnelTweaksSession: true,
      }),
    ).toBe('funnel-tweaks')
  })
})

describe('resolveSpaceChatPanelMode', () => {
  it('uses first-match specialized render priority when sessions are active', () => {
    expect(
      resolveSpaceChatPanelMode({
        mode: 'chat',
        presentationCommentsActive: true,
        hasPresentationCommentsSession: true,
        funnelTweaksActive: true,
        hasFunnelTweaksSession: true,
      }),
    ).toBe('presentation-comments')
  })

  it('keeps the current mode when no specialized session is visible', () => {
    expect(
      resolveSpaceChatPanelMode({
        mode: 'voice-runs',
        presentationCommentsActive: true,
        hasPresentationCommentsSession: false,
      }),
    ).toBe('voice-runs')
  })
})
