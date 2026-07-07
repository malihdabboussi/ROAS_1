import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputNormalFooter } from './chat-input-normal-footer'

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name, className }: { name: string; className?: string }) => (
    <span className={className} data-testid={`icon-${name}`} />
  ),
}))

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

function defaultProps(overrides: Partial<Parameters<typeof ChatInputNormalFooter>[0]> = {}) {
  const portalTarget = document.createElement('div')
  document.body.appendChild(portalTarget)

  return {
    composerPadX: 'px-spacing-2',
    compact: false,
    disabled: false,
    plusButtonRef: createRef<HTMLButtonElement>(),
    onTogglePlusMenu: vi.fn(),
    modelPickerProps: {
      activeComposerModel: 'auto:balanced',
      activeComposerModelLabel: 'Balanced',
      activeComposerDisplayMeta: null,
      cortexMaxEnabled: false,
      standardModels: [],
      subscriptionModels: [],
      selectedContextWindowTokens: null,
      selectedReasoningEffort: null,
      fastModeEnabled: false,
      modelDropdownOpen: false,
      modelDropdownPos: { top: 0, left: 0 },
      modelHoverTarget: null,
      modelHoverPos: { top: 0, left: 0 },
      modelEditId: null,
      modelEditOption: undefined,
      modelEditPos: { top: 0, left: 0 },
      modelEditTooltip: null,
      modelButtonRef: createRef<HTMLButtonElement>(),
      modelDropdownRef: createRef<HTMLDivElement>(),
      subscriptionSubmenuRef: createRef<HTMLDivElement>(),
      modelHoverCardRef: createRef<HTMLDivElement>(),
      modelEditPanelRef: createRef<HTMLDivElement>(),
      portalTargetRef: undefined,
      onToggleDropdown: vi.fn(),
      onCloseDropdown: vi.fn(),
      onSelectComposerModel: vi.fn(),
      onSetHoverTarget: vi.fn(),
      onPositionHoverCard: vi.fn(),
      onOpenModelEditPanel: vi.fn(),
      onOpenWorkspaceModels: vi.fn(),
      onCortexMaxChange: vi.fn(),
      onSetFastModeEnabled: vi.fn(),
      onSetReasoningEffort: vi.fn(),
      onSetContextWindowTokens: vi.fn(),
      onShowModelEditTooltip: vi.fn(),
      onClearModelEditTooltip: vi.fn(),
    },
    composerFooterAfterIntegrationsSlot: <span>Send to space</span>,
    activeCapabilityChip: { label: 'Research web', icon: 'search' },
    onClearCapabilityChip: vi.fn(),
    plusMenuProps: {
      open: false,
      portalTarget,
      menuPosition: { top: 10, left: 20 },
      submenu: null,
      submenuPosition: { top: 30, left: 40 },
      infoCard: null,
      connectedProviders: [],
      suggestedUnconnected: [],
      agentToggles: [],
      allSlashItems: [],
      skillDenyKeys: new Set<string>(),
      skillTogglePending: null,
      composerPolicy: null,
      composerPolicyLoading: false,
      composerPolicyPending: null,
      accessReadOnly: false,
      onSubmenuAnchorNode: vi.fn(),
      onOpenSubmenu: vi.fn(),
      onCancelSubmenuClose: vi.fn(),
      onScheduleSubmenuClose: vi.fn(),
      onLocalUpload: vi.fn(),
      onDrive: vi.fn(),
      onDropbox: vi.fn(),
      onCloseMenu: vi.fn(),
      onOpenAtMenu: vi.fn(),
      onToggleAgent: vi.fn(),
      onConnectIntegration: vi.fn(),
      onToggleSkill: vi.fn(),
      onToggleAccess: vi.fn(),
      onShowInfoCard: vi.fn(),
      onClearInfoCard: vi.fn(),
    },
    contextMeter: {
      version: 1 as const,
      source: 'estimate' as const,
      generatedAt: 1,
      totalTokens: 25_000,
      contextWindow: 100_000,
      slices: [],
    },
    breakdownPanelEnabled: true,
    contextPopoverOpen: false,
    contextMeterAnchorRef: createRef<HTMLSpanElement>(),
    contextMeterTriggerRef: createRef<HTMLButtonElement>(),
    onOpenContextPopoverBeforeToggle: vi.fn(),
    onToggleContextPopover: vi.fn(),
    contextPopoverPanelRef: createRef<HTMLDivElement>(),
    contextPopoverPosition: null,
    portalTarget,
    voiceSendProps: {
      disabled: false,
      sendDisabled: false,
      isStreaming: false,
      onStartRecording: vi.fn(),
      onVoiceStart: vi.fn(),
      onSend: vi.fn(),
      onStop: vi.fn(),
    },
    ...overrides,
  }
}

describe('ChatInputNormalFooter', () => {
  it('renders the normal composer controls and delegates primary actions', () => {
    const props = defaultProps()

    render(<ChatInputNormalFooter {...props} />)

    expect(screen.getByText('Balanced')).toBeTruthy()
    expect(screen.getByText('Send to space')).toBeTruthy()
    expect(screen.getByText('Research web')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open add menu' }))
    expect(props.onTogglePlusMenu).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Open context breakdown' }))
    expect(props.onOpenContextPopoverBeforeToggle).toHaveBeenCalledTimes(1)
    expect(props.onToggleContextPopover).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(props.voiceSendProps.onSend).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Clear selected capability' }))
    expect(props.onClearCapabilityChip).toHaveBeenCalledTimes(1)
  })

  it('omits the context controls when there is no measured context window', () => {
    const props = defaultProps({
      contextMeter: {
        version: 1 as const,
        source: 'estimate' as const,
        generatedAt: 1,
        totalTokens: 0,
        contextWindow: 0,
        slices: [],
      },
    })

    render(<ChatInputNormalFooter {...props} />)

    expect(screen.queryByRole('button', { name: 'Open context breakdown' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy()
  })

  it('passes plus submenu actions through the portal props', () => {
    const props = defaultProps({
      plusMenuProps: {
        ...defaultProps().plusMenuProps,
        open: true,
        submenu: 'attach',
      },
    })

    render(<ChatInputNormalFooter {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Media' }))
    expect(props.plusMenuProps.onCloseMenu).toHaveBeenCalledTimes(1)
    expect(props.plusMenuProps.onOpenAtMenu).toHaveBeenCalledWith('media')
  })
})
