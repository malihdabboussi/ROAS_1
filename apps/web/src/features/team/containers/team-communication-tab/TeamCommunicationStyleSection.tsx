'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  STYLE_PRESETS,
  type StylePresetKey,
} from '../../constants/team.constants'
import { CommsSectionHeader } from './CommsSectionHeader'
import type { TeamCommunicationTabProps } from './team-communication-tab.types'

interface TeamCommunicationStyleSectionProps
  extends Pick<
    TeamCommunicationTabProps,
    'communicationSaving' | 'communicationError' | 'handleCommunicationStyleChange'
  > {
  selected: NonNullable<TeamCommunicationTabProps['selected']>
  collapsed: boolean
  onToggle: () => void
  isReadOnly: boolean
}

export function TeamCommunicationStyleSection({
  selected,
  communicationSaving,
  communicationError,
  handleCommunicationStyleChange,
  collapsed,
  onToggle,
  isReadOnly,
}: TeamCommunicationStyleSectionProps) {
  const currentStyleRaw =
    (selected.config as Record<string, string> | undefined)?.communication_style || ''
  const [styleText, setStyleText] = useState(currentStyleRaw)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const next = (selected.config as Record<string, string> | undefined)?.communication_style || ''
    setStyleText(next)
  }, [selected.id, selected.config])

  const handleStyleTextChange = useCallback(
    (value: string) => {
      setStyleText(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        void handleCommunicationStyleChange(value)
      }, 800)
    },
    [handleCommunicationStyleChange],
  )

  const handlePresetClick = useCallback(
    (key: StylePresetKey) => {
      const preset = STYLE_PRESETS[key]
      setStyleText(preset.description)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void handleCommunicationStyleChange(preset.description)
    },
    [handleCommunicationStyleChange],
  )

  const activePresetKey =
    (
      Object.entries(STYLE_PRESETS) as [StylePresetKey, { label: string; description: string }][]
    ).find(([, preset]) => preset.description === styleText)?.[0] ?? null

  return (
    <>
      <CommsSectionHeader
        title="Communication style"
        collapsed={collapsed}
        onToggle={onToggle}
        first={false}
      />
      {!collapsed ? (
        <div className="space-y-spacing-2 px-spacing-2 pb-spacing-1">
          <textarea
            value={styleText}
            onChange={(e) => handleStyleTextChange(e.target.value)}
            disabled={isReadOnly || communicationSaving}
            placeholder="e.g., Talk in slang, be extra casual, use Gen-Z language..."
            rows={3}
            className="body-3 text-foreground bg-muted/30 placeholder:text-muted-foreground/40 min-h-[4.5rem] w-full resize-none rounded-md px-2 py-2 outline-none disabled:opacity-50"
          />
          <div className="mt-spacing-2 gap-spacing-1 flex flex-wrap">
            {(
              Object.entries(STYLE_PRESETS) as [
                StylePresetKey,
                { label: string; description: string },
              ][]
            ).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                disabled={isReadOnly || communicationSaving}
                onClick={() => handlePresetClick(key)}
                className={`body-4 rounded-full px-2.5 py-1 font-medium transition-all ${
                  activePresetKey === key ? 'chip-glass-blue' : 'chip-glass-neutral'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {communicationSaving && (
            <p className="body-4 text-muted-foreground mt-spacing-2">Saving...</p>
          )}
          {communicationError && (
            <p className="body-4 mt-spacing-1 text-destructive">{communicationError}</p>
          )}
        </div>
      ) : null}
    </>
  )
}
