import type { ReactNode, Ref } from 'react'
import { Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ChatInputActiveCapabilityChip } from './chat-input-active-capability-chip'
import { ChatInputContextMeter } from './chat-input-context-meter'
import { ChatInputContextPopoverPortal } from './chat-input-context-popover-portal'
import { ChatInputModelPickerView } from './chat-input-model-picker-view'
import { ChatInputPlusMenuPortal } from './chat-input-plus-menu-portal'
import { ChatInputVoiceSendControls } from './chat-input-voice-send-controls'

type ModelPickerProps = Parameters<typeof ChatInputModelPickerView>[0]
type ActiveCapabilityChipProps = Parameters<typeof ChatInputActiveCapabilityChip>[0]
type PlusMenuPortalProps = Parameters<typeof ChatInputPlusMenuPortal>[0]
type ContextMeterProps = Parameters<typeof ChatInputContextMeter>[0]
type ContextPopoverPortalProps = Parameters<typeof ChatInputContextPopoverPortal>[0]
type VoiceSendControlsProps = Parameters<typeof ChatInputVoiceSendControls>[0]

interface ChatInputNormalFooterProps {
  composerPadX: string
  compact: boolean
  disabled: boolean
  plusButtonRef: Ref<HTMLButtonElement>
  onTogglePlusMenu: () => void
  modelPickerProps: ModelPickerProps
  composerFooterAfterIntegrationsSlot?: ReactNode
  activeCapabilityChip: ActiveCapabilityChipProps['chip']
  onClearCapabilityChip: ActiveCapabilityChipProps['onClear']
  plusMenuProps: PlusMenuPortalProps
  contextMeter: ContextPopoverPortalProps['breakdown'] | null
  breakdownPanelEnabled: boolean
  contextPopoverOpen: boolean
  contextMeterAnchorRef: ContextMeterProps['anchorRef']
  contextMeterTriggerRef: ContextMeterProps['triggerRef']
  onOpenContextPopoverBeforeToggle: ContextMeterProps['onOpenBeforeToggle']
  onToggleContextPopover: ContextMeterProps['onToggle']
  contextPopoverPanelRef: ContextPopoverPortalProps['panelRef']
  contextPopoverPosition: ContextPopoverPortalProps['position']
  portalTarget: ContextPopoverPortalProps['portalTarget']
  voiceSendProps: VoiceSendControlsProps
}

export function ChatInputNormalFooter({
  composerPadX,
  compact,
  disabled,
  plusButtonRef,
  onTogglePlusMenu,
  modelPickerProps,
  composerFooterAfterIntegrationsSlot,
  activeCapabilityChip,
  onClearCapabilityChip,
  plusMenuProps,
  contextMeter,
  breakdownPanelEnabled,
  contextPopoverOpen,
  contextMeterAnchorRef,
  contextMeterTriggerRef,
  onOpenContextPopoverBeforeToggle,
  onToggleContextPopover,
  contextPopoverPanelRef,
  contextPopoverPosition,
  portalTarget,
  voiceSendProps,
}: ChatInputNormalFooterProps) {
  return (
    <div
      className={`flex items-center justify-between ${composerPadX} ${compact ? 'py-spacing-1' : 'py-spacing-2'}`}
    >
      <div className="flex items-center gap-1">
        <Tooltip label="Add">
          <button
            ref={plusButtonRef}
            type="button"
            onClick={onTogglePlusMenu}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
            aria-label="Open add menu"
          >
            <Plus className="h-4 w-4" />
          </button>
        </Tooltip>

        <ChatInputModelPickerView {...modelPickerProps} />

        {composerFooterAfterIntegrationsSlot ? (
          <div className="ml-spacing-1 flex min-w-0 shrink-0 items-center">
            {composerFooterAfterIntegrationsSlot}
          </div>
        ) : null}

        <ChatInputActiveCapabilityChip
          chip={activeCapabilityChip}
          onClear={onClearCapabilityChip}
        />
        <ChatInputPlusMenuPortal {...plusMenuProps} />
      </div>

      <div className="flex items-center gap-0.5">
        {contextMeter && contextMeter.contextWindow > 0 ? (
          <>
            <ChatInputContextMeter
              meter={contextMeter}
              breakdownPanelEnabled={breakdownPanelEnabled}
              popoverOpen={contextPopoverOpen}
              anchorRef={contextMeterAnchorRef}
              triggerRef={contextMeterTriggerRef}
              onOpenBeforeToggle={onOpenContextPopoverBeforeToggle}
              onToggle={onToggleContextPopover}
            />
            <ChatInputContextPopoverPortal
              open={breakdownPanelEnabled && contextPopoverOpen}
              panelRef={contextPopoverPanelRef}
              position={contextPopoverPosition}
              portalTarget={portalTarget}
              breakdown={contextMeter}
            />
          </>
        ) : null}
        <ChatInputVoiceSendControls {...voiceSendProps} />
      </div>
    </div>
  )
}
