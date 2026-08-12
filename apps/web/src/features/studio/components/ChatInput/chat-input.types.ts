import type { ReactNode } from 'react'
import type { ShellCreateMenuItem } from '@/components/shell/shell-create-menu.config'
import type { ChatModelSettings } from '@/features/studio/services/chat.service'
import type { ChatScopeKind, DocumentAttachment, MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { ChatInputPlusMenuSpacePickerConfig } from './chat-input-plus-menu-space.types'
import type { ChatInputSpaceComposerSpaceTask } from './use-chat-input-at-mention-controller'

export interface ChatInputProps {
  onSend: (
    content: string,
    documents?: DocumentAttachment[],
    artifacts?: AttachedArtifact[],
    model?: string,
    references?: MessageReference[],
    modelSettings?: ChatModelSettings,
  ) => void
  disabled?: boolean
  sendDisabled?: boolean
  creditsExhausted?: boolean
  isStreaming?: boolean
  onStop?: () => void
  placeholder?: string
  initialValue?: string
  /** Pre-populate file attachments (used when editing a message that had documents). */
  initialDocuments?: DocumentAttachment[]
  /** When this changes, re-apply `initialValue` and `initialDocuments` into the composer. */
  restoreNonce?: string
  /** Override persisted draft identity when this composer is not the main conversation composer. */
  draftContextKeyOverride?: string
  /** Whether this composer should consume global text inserted by artifact/analysis actions. */
  consumePendingComposerText?: boolean
  /** Extra border-radius class override (defaults to rounded-2xl). */
  roundedClass?: string
  /** Override the outer wrapper className entirely (skips default input-glass). */
  wrapperClass?: string
  /** Ref to receive insertText(text) - appends text to composer and focuses. */
  insertTextRef?: React.MutableRefObject<((text: string) => void) | null>
  /** Ref to receive setText(text) - replaces composer text and focuses. */
  setTextRef?: React.MutableRefObject<((text: string) => void) | null>
  /** Mirrors the current composer text on each render. */
  composerMirrorRef?: React.MutableRefObject<string>
  /** Fires whenever composer text changes (empty-state chrome, etc.). */
  onComposerValueChange?: (value: string) => void
  /** Selected capability chip shown inside composer footer. */
  activeCapabilityChip?: { label: string; icon: string } | null
  /** Clear selected capability chip. */
  onClearCapabilityChip?: () => void
  /**
   * Handles a "+ Create" menu pick. Wire to the surface's quick-start hook so
   * the item's systemContext rides the send; without it the composer only
   * seeds the item's prompt text.
   */
  onCreateMenuSelect?: (item: ShellCreateMenuItem) => void
  /** Compact mode - tighter padding for in-chat composer. */
  compact?: boolean
  campaignId?: string
  spaceId?: string | null
  scopeKind?: ChatScopeKind
  conversationId?: string | null
  defaultModel?: string | null
  defaultModelSettings?: ChatModelSettings | null
  campaignModelStrategy?: string | null
  /** Queue a message during streaming instead of sending. */
  onEnqueue?: (
    content: string,
    documents?: DocumentAttachment[],
    artifacts?: AttachedArtifact[],
    model?: string,
    references?: MessageReference[],
    modelSettings?: ChatModelSettings,
  ) => void
  /** Stop current stream and send next queued item immediately. */
  onSendNow?: () => void
  /** Number of items in the queue (used to enable double-Enter). */
  queueLength?: number
  /** Ref to portal target for dropdowns, e.g. inside a Radix Dialog. */
  portalTargetRef?: React.RefObject<HTMLElement | null>
  /** Start a live voice conversation with the agent. */
  onVoiceStart?: () => void
  /** Agent key to load slash-command skills for (defaults to 'vibey'). */
  agentKey?: string
  /** Optional outer element to also accept artifact/file drops. */
  dropZoneRef?: React.RefObject<HTMLElement | null>
  /** Space ROAS chat: regular tasks merged into the @ mention menu. */
  spaceComposerSpaceTasks?: ChatInputSpaceComposerSpaceTask[]
  /** Listen for Space ROAS external attach events and show an @ shortcut. */
  spaceComposerListenExternalAttach?: boolean
  /** Footer slot next to the Integrations control, e.g. Home "Send to". */
  composerFooterAfterIntegrationsSlot?: ReactNode
  /** Optional space picker surfaced in the composer plus menu (Home dashboard). */
  plusMenuSpacePicker?: ChatInputPlusMenuSpacePickerConfig
  /** Optional wrapper class for the default composer footer row. */
  footerWrapperClassName?: string
}
