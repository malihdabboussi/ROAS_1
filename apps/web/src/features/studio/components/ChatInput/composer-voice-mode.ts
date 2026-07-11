export type ComposerVoiceMode = 'input' | 'live'

const STORAGE_KEY = 'vibey.composer.voice-default'

type StoredVoiceDefaults = {
  byScope?: Record<string, ComposerVoiceMode>
  fallback?: ComposerVoiceMode
}

function readStore(): StoredVoiceDefaults {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredVoiceDefaults) : {}
  } catch {
    return {}
  }
}

function writeStore(next: StoredVoiceDefaults) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

export function voiceDefaultScopeKey(spaceId?: string | null): string {
  return spaceId && spaceId.length > 0 ? spaceId : '__global__'
}

export function readComposerVoiceDefault(spaceId?: string | null): ComposerVoiceMode {
  const store = readStore()
  const scoped = store.byScope?.[voiceDefaultScopeKey(spaceId)]
  if (scoped === 'input' || scoped === 'live') return scoped
  return store.fallback === 'live' ? 'live' : 'input'
}

export function writeComposerVoiceDefault(
  spaceId: string | null | undefined,
  mode: ComposerVoiceMode,
) {
  const store = readStore()
  const scopeKey = voiceDefaultScopeKey(spaceId)
  writeStore({
    ...store,
    byScope: {
      ...(store.byScope ?? {}),
      [scopeKey]: mode,
    },
    fallback: store.fallback ?? 'input',
  })
}

export const COMPOSER_VOICE_MODE_OPTIONS: Array<{
  id: ComposerVoiceMode
  label: string
  shortcut: string
  description: string
}> = [
  {
    id: 'input',
    label: 'Voice input',
    shortcut: '⌘D',
    description: 'Dictate a message into the composer.',
  },
  {
    id: 'live',
    label: 'Live conversation',
    shortcut: '⌘S',
    description: 'Start a live voice call with the agent.',
  },
]
