export type SpaceChatMode =
  | 'chat'
  | 'conversations'
  | 'voice-runs'
  | 'presentation-comments'
  | 'presentation-design'
  | 'presentation-tweaks'
  | 'funnel-comments'
  | 'funnel-design'
  | 'funnel-tweaks'

export interface SpaceChatSpecialModeState {
  mode: SpaceChatMode
  presentationCommentsActive?: boolean
  hasPresentationCommentsSession?: boolean
  presentationDesignActive?: boolean
  hasPresentationDesignSession?: boolean
  presentationTweaksActive?: boolean
  hasPresentationTweaksSession?: boolean
  funnelCommentsActive?: boolean
  hasFunnelCommentsSession?: boolean
  funnelDesignActive?: boolean
  hasFunnelDesignSession?: boolean
  funnelTweaksActive?: boolean
  hasFunnelTweaksSession?: boolean
}

function applySpecialMode(
  current: SpaceChatMode,
  active: boolean | undefined,
  hasSession: boolean | undefined,
  specialMode: SpaceChatMode,
): SpaceChatMode {
  if (active && hasSession) return specialMode
  if ((!active || !hasSession) && current === specialMode) return 'chat'
  return current
}

export function resolveSpaceChatSpecialMode(state: SpaceChatSpecialModeState): SpaceChatMode {
  let next = state.mode
  next = applySpecialMode(
    next,
    state.presentationCommentsActive,
    state.hasPresentationCommentsSession,
    'presentation-comments',
  )
  next = applySpecialMode(
    next,
    state.presentationDesignActive,
    state.hasPresentationDesignSession,
    'presentation-design',
  )
  next = applySpecialMode(
    next,
    state.presentationTweaksActive,
    state.hasPresentationTweaksSession,
    'presentation-tweaks',
  )
  next = applySpecialMode(
    next,
    state.funnelCommentsActive,
    state.hasFunnelCommentsSession,
    'funnel-comments',
  )
  next = applySpecialMode(
    next,
    state.funnelDesignActive,
    state.hasFunnelDesignSession,
    'funnel-design',
  )
  next = applySpecialMode(
    next,
    state.funnelTweaksActive,
    state.hasFunnelTweaksSession,
    'funnel-tweaks',
  )
  return next
}

export function resolveSpaceChatPanelMode(state: SpaceChatSpecialModeState): SpaceChatMode {
  if (state.presentationCommentsActive && state.hasPresentationCommentsSession) {
    return 'presentation-comments'
  }
  if (state.presentationDesignActive && state.hasPresentationDesignSession) {
    return 'presentation-design'
  }
  if (state.presentationTweaksActive && state.hasPresentationTweaksSession) {
    return 'presentation-tweaks'
  }
  if (state.funnelCommentsActive && state.hasFunnelCommentsSession) {
    return 'funnel-comments'
  }
  if (state.funnelDesignActive && state.hasFunnelDesignSession) {
    return 'funnel-design'
  }
  if (state.funnelTweaksActive && state.hasFunnelTweaksSession) {
    return 'funnel-tweaks'
  }
  return state.mode
}
