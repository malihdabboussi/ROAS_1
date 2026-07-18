'use client'

import { useCallback, useState } from 'react'
import { ChevronDown, List } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ShellRightPanelPicker, type ShellRightPanelSurface } from './ShellRightPanelPicker'
import { useShellStore } from './use-shell-store'

export function ShellRightPanelControl() {
  const [pickerOpen, setPickerOpen] = useState(false)
  const rightPanelOpen = useShellStore((s) => s.rightPanel.open)
  const rightPanelTab = useShellStore((s) => s.rightPanel.tab)
  const toggleRightPanel = useShellStore((s) => s.toggleRightPanel)
  const openRightPanelSurface = useShellStore((s) => s.openRightPanelSurface)

  const closePicker = useCallback(() => setPickerOpen(false), [])

  const onSelectSurface = useCallback(
    (surface: ShellRightPanelSurface) => {
      openRightPanelSurface(surface)
    },
    [openRightPanelSurface],
  )

  return (
    <div className="shell-topbar-right-panel-control relative">
      <button
        type="button"
        title={rightPanelOpen ? 'Close panel' : 'Open panel'}
        aria-pressed={rightPanelOpen}
        onClick={() => {
          setPickerOpen(false)
          toggleRightPanel()
        }}
        className={cn(
          'shell-topbar-icon-btn shell-topbar-right-panel-main',
          rightPanelOpen && 'shell-topbar-icon-btn-active',
        )}
      >
        <List />
      </button>
      <button
        type="button"
        title="Choose panel surface"
        aria-expanded={pickerOpen}
        aria-haspopup="menu"
        onClick={() => setPickerOpen((v) => !v)}
        className={cn(
          'shell-topbar-icon-btn shell-topbar-right-panel-chevron',
          (rightPanelOpen || pickerOpen) && 'shell-topbar-icon-btn-active',
        )}
      >
        <ChevronDown />
      </button>
      {pickerOpen ? (
        <ShellRightPanelPicker
          activeSurface={rightPanelTab}
          panelOpen={rightPanelOpen}
          onSelect={onSelectSurface}
          onClose={closePicker}
        />
      ) : null}
    </div>
  )
}
