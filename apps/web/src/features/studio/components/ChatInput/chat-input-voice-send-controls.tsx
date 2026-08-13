'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AudioWaveform, Check, Mic, Send, Square } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { positionFloatingMenuFromAnchorRect } from '@/lib/ui/floating-menu-anchor'
import { PLUS_MENU_GAP } from './chat-input-constants'
import {
  COMPOSER_VOICE_MODE_OPTIONS,
  readComposerVoiceDefault,
  writeComposerVoiceDefault,
  type ComposerVoiceMode,
} from './composer-voice-mode'

const VOICE_MENU_WIDTH = 240
const VOICE_MENU_HEIGHT = 120
const VIEWPORT_MARGIN = 8
const HOVER_CLOSE_MS = 150

interface ChatInputVoiceSendControlsProps {
  disabled: boolean
  sendDisabled: boolean
  isStreaming: boolean
  spaceId?: string | null
  onStartRecording: () => void
  onVoiceStart?: () => void
  onSend: () => void
  onStop?: () => void
  /** Home v4 uses larger icon sizing via wrapper class. */
  voiceButtonClassName?: string
  sendButtonClassName?: string
  sendButtonActiveClassName?: string
  sendButtonIdleClassName?: string
  iconClassName?: string
  sendIconClassName?: string
  hasText?: boolean
}

export function ChatInputVoiceSendControls({
  disabled,
  sendDisabled,
  isStreaming,
  spaceId,
  onStartRecording,
  onVoiceStart,
  onSend,
  onStop,
  voiceButtonClassName = 'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30',
  sendButtonClassName,
  sendButtonActiveClassName,
  sendButtonIdleClassName,
  iconClassName = 'h-3.5 w-3.5',
  sendIconClassName = 'h-3.5 w-3.5',
  hasText,
}: ChatInputVoiceSendControlsProps) {
  const liveVoiceAvailable = Boolean(onVoiceStart)
  const [defaultMode, setDefaultMode] = useState<ComposerVoiceMode>(() =>
    readComposerVoiceDefault(spaceId),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const voiceButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDefaultMode(readComposerVoiceDefault(spaceId))
  }, [spaceId])

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false)
      closeTimerRef.current = null
    }, HOVER_CLOSE_MS)
  }, [clearCloseTimer])

  const updateMenuPosition = useCallback(() => {
    if (!voiceButtonRef.current) return
    const rect = voiceButtonRef.current.getBoundingClientRect()
    const nextPosition = positionFloatingMenuFromAnchorRect(rect, {
      menuWidth: VOICE_MENU_WIDTH,
      menuHeight: VOICE_MENU_HEIGHT,
      gap: PLUS_MENU_GAP,
      viewportMargin: VIEWPORT_MARGIN,
      horizontalAlign: 'end',
    })
    setMenuPos(nextPosition)
  }, [])

  const openMenu = useCallback(() => {
    if (!liveVoiceAvailable) return
    clearCloseTimer()
    setMenuOpen(true)
    updateMenuPosition()
  }, [clearCloseTimer, liveVoiceAvailable, updateMenuPosition])

  const runVoiceMode = useCallback(
    (mode: ComposerVoiceMode) => {
      setDefaultMode(mode)
      writeComposerVoiceDefault(spaceId, mode)
      clearCloseTimer()
      setMenuOpen(false)
      if (mode === 'live' && liveVoiceAvailable) {
        onVoiceStart?.()
      } else {
        onStartRecording()
      }
    },
    [clearCloseTimer, liveVoiceAvailable, onStartRecording, onVoiceStart, spaceId],
  )

  useLayoutEffect(() => {
    if (!menuOpen) return
    updateMenuPosition()
  }, [menuOpen, updateMenuPosition])

  useEffect(() => {
    if (!menuOpen) return
    const reposition = () => updateMenuPosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [menuOpen, updateMenuPosition])

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  const activeMode = defaultMode === 'live' && liveVoiceAvailable ? 'live' : 'input'
  const defaultShortcut =
    COMPOSER_VOICE_MODE_OPTIONS.find((option) => option.id === activeMode)?.shortcut ?? '⌘D'
  const VoiceIcon = activeMode === 'live' ? AudioWaveform : Mic
  const portalTarget = typeof document === 'undefined' ? null : document.body

  const resolvedSendClassName =
    sendButtonClassName ??
    '-ml-spacing-0-5 bg-secondary flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30'
  const resolvedSendActiveClassName =
    sendButtonActiveClassName ?? 'text-primary hover:bg-secondary/90'
  const resolvedSendIdleClassName = sendButtonIdleClassName ?? 'text-primary hover:bg-secondary/90'

  return (
    <div className="gap-spacing-0 flex items-center">
      <div
        className="relative flex items-center"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <Tooltip
          label={
            liveVoiceAvailable
              ? `${activeMode === 'live' ? 'Live conversation' : 'Voice input'} (${defaultShortcut})`
              : `Voice input (${defaultShortcut})`
          }
        >
          <button
            ref={voiceButtonRef}
            type="button"
            onClick={liveVoiceAvailable ? openMenu : onStartRecording}
            disabled={disabled}
            className={voiceButtonClassName}
            aria-label={activeMode === 'live' ? 'Live voice conversation' : 'Voice input'}
            aria-haspopup={liveVoiceAvailable ? 'menu' : undefined}
          >
            <VoiceIcon className={iconClassName} />
          </button>
        </Tooltip>

        {menuOpen && liveVoiceAvailable && portalTarget
          ? createPortal(
              <div
                ref={menuRef}
                className="dropdown-menu-solid z-dropdown py-spacing-1 fixed"
                style={{ top: menuPos.top, left: menuPos.left, width: VOICE_MENU_WIDTH }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleClose}
              >
                <p className="body-4 text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-1 font-medium uppercase tracking-wide">
                  Choose voice mode
                </p>
                {COMPOSER_VOICE_MODE_OPTIONS.map((option) => {
                  const isDefault = activeMode === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => runVoiceMode(option.id)}
                      className={`rounded-spacing-1 body-4 hover:bg-hover-subtle mx-spacing-1 gap-spacing-2 px-spacing-2 py-spacing-1 flex w-[calc(100%-8px)] items-start justify-between text-left transition-all ${
                        isDefault ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="text-foreground block font-medium">{option.label}</span>
                        <span className="text-muted-foreground body-4 block">
                          {option.description}
                        </span>
                      </span>
                      <span className="gap-spacing-1 flex shrink-0 items-center">
                        <span className="text-muted-foreground body-4">{option.shortcut}</span>
                        {isDefault ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>,
              portalTarget,
            )
          : null}
      </div>

      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className={
            sendButtonClassName
              ? `${sendButtonClassName} text-destructive`
              : '-ml-spacing-0-5 bg-secondary text-destructive hover:bg-secondary/90 flex h-8 w-8 items-center justify-center rounded-full transition-colors'
          }
          aria-label="Stop generating"
        >
          <Square className={`${sendIconClassName} fill-current`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={sendDisabled}
          className={
            sendButtonClassName
              ? `${sendButtonClassName} ${
                  hasText ? sendButtonActiveClassName : sendButtonIdleClassName
                }`
              : `${resolvedSendClassName} ${
                  hasText === false ? resolvedSendIdleClassName : resolvedSendActiveClassName
                }`
          }
          aria-label="Send message"
        >
          <Send className={sendIconClassName} />
        </button>
      )}
    </div>
  )
}
