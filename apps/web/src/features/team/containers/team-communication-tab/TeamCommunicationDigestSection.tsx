'use client'

import { createPortal } from 'react-dom'
import { ChevronDown, Info } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { backendPatch } from '@/lib/api/backend-client'
import { CommsSectionHeader } from './CommsSectionHeader'
import { DROPDOWN_CHEVRON, DROPDOWN_TRIGGER_CLASS } from './team-communication-tab.constants'
import type { TeamCommunicationTabProps } from './team-communication-tab.types'

interface TeamCommunicationDigestSectionProps
  extends Pick<
    TeamCommunicationTabProps,
    | 'digestEnabled'
    | 'setDigestEnabled'
    | 'digestSaving'
    | 'setDigestSaving'
    | 'digestTime'
    | 'setDigestTime'
    | 'digestDropdownOpen'
    | 'setDigestDropdownOpen'
    | 'digestDropdownBtnRef'
    | 'digestDropdownPos'
  > {
  selected: NonNullable<TeamCommunicationTabProps['selected']>
  collapsed: boolean
  onToggle: () => void
  isReadOnly: boolean
}

function formatDigestLocalTime(digestTime: string): string {
  const [h, m] = digestTime.split(':').map(Number)
  const utcDate = new Date()
  utcDate.setUTCHours(h ?? 8, m ?? 0, 0, 0)
  const localH = String(utcDate.getHours()).padStart(2, '0')
  const localM = utcDate.getMinutes() < 30 ? '00' : '30'
  return `${localH}:${localM}`
}

function localSlotToUtc(slot: string): string {
  const [lh, lm] = slot.split(':').map(Number)
  const d = new Date()
  d.setHours(lh ?? 8, lm ?? 0, 0, 0)
  const utcH = String(d.getUTCHours()).padStart(2, '0')
  const utcM = d.getUTCMinutes() < 30 ? '00' : '30'
  return `${utcH}:${utcM}`
}

export function TeamCommunicationDigestSection({
  selected,
  digestEnabled,
  setDigestEnabled,
  digestSaving,
  setDigestSaving,
  digestTime,
  setDigestTime,
  digestDropdownOpen,
  setDigestDropdownOpen,
  digestDropdownBtnRef,
  digestDropdownPos,
  collapsed,
  onToggle,
  isReadOnly,
}: TeamCommunicationDigestSectionProps) {
  const currentLocal = formatDigestLocalTime(digestTime)

  return (
    <>
      <CommsSectionHeader
        title="Daily summary"
        collapsed={collapsed}
        onToggle={onToggle}
        first={false}
      />
      {!collapsed ? (
        <div className="space-y-spacing-3 px-spacing-2 pb-spacing-1">
          <div className="gap-spacing-2 sm:gap-spacing-4 relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5 sm:pt-1.5">
              <p className="body-4 text-muted-foreground/70">Get a daily summary</p>
              <Tooltip
                wide
                label={`Once a day, ${selected.name} sends you a short recap of what changed in the last 24 hours and what may need a follow-up—so the important stuff doesn’t get buried.`}
                side="top"
                delayMs={300}
              >
                <button
                  type="button"
                  className="text-muted-foreground inline-flex cursor-help"
                  aria-label="What the daily summary is"
                >
                  <Info className="icon-xs shrink-0" aria-hidden />
                </button>
              </Tooltip>
            </div>
            <Switch
              checked={digestEnabled}
              disabled={isReadOnly || digestSaving}
              onCheckedChange={async (val) => {
                setDigestEnabled(val)
                setDigestSaving(true)
                await backendPatch('/api/missions/profile/settings', {
                  daily_digest_enabled: val,
                }).catch(() => setDigestEnabled(!val))
                setDigestSaving(false)
              }}
            />
          </div>
          {digestEnabled && (
            <div className="gap-spacing-2 sm:gap-spacing-4 relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <p className="body-4 text-muted-foreground/70 sm:pt-1.5">Send at</p>
              <div className="relative w-full min-w-0 sm:w-auto" data-dropdown>
                <button
                  ref={digestDropdownBtnRef}
                  type="button"
                  onClick={() => setDigestDropdownOpen((p) => !p)}
                  disabled={isReadOnly || digestSaving}
                  className={`${DROPDOWN_TRIGGER_CLASS} w-full min-w-0 gap-1.5 sm:w-auto sm:min-w-[7rem] sm:max-w-[min(100%,16rem)] sm:shrink-0`}
                >
                  <span className="min-w-0 truncate font-medium">{currentLocal}</span>
                  <ChevronDown
                    className={`${DROPDOWN_CHEVRON} transition-transform ${digestDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {digestDropdownOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      data-dropdown
                      className="z-dropdown rounded-spacing-2 fixed shadow-lg"
                      style={{
                        top: digestDropdownPos.top,
                        left: digestDropdownPos.left,
                        width: digestDropdownPos.width,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div
                        className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 max-h-[200px] overflow-y-auto"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        <div className="space-y-spacing-0">
                          {[...Array(48)].map((_, i) => {
                            const hh = String(Math.floor(i / 2)).padStart(2, '0')
                            const mm = i % 2 === 0 ? '00' : '30'
                            const slot = `${hh}:${mm}`
                            const isSelected = currentLocal === slot
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={async () => {
                                  const utcVal = localSlotToUtc(slot)
                                  setDigestTime(utcVal)
                                  setDigestDropdownOpen(false)
                                  setDigestSaving(true)
                                  await backendPatch('/api/missions/profile/settings', {
                                    daily_digest_time: utcVal,
                                  }).catch(() => null)
                                  setDigestSaving(false)
                                }}
                                className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-all ${
                                  isSelected
                                    ? 'bg-primary/10 text-foreground'
                                    : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                                }`}
                              >
                                {slot}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
