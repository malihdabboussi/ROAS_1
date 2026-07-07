'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  SaveIndicator,
  type SaveIndicatorStatus,
} from '@/components/ui/feedback/SaveIndicator'
import Switch from '@/components/ui/forms/switch'
import { EmailPreviewEditor } from './EmailPreviewEditor'
import { InlineEditableArtifactTitle } from './InlineEditableArtifactTitle'

export type SequenceEmailEditorSaveStatus = SaveIndicatorStatus

export interface SequenceEmailCardData {
  id: string
  subject: string | null
  body: string | null
  status: string
  delay_hours: number
  order_index: number
}

type DelayUnit = 'hours' | 'days'

function getDelayDisplay(hours: number): string {
  if (hours <= 0) return 'Immediately'
  if (hours % 24 === 0) {
    const days = Math.floor(hours / 24)
    return `${days} ${days === 1 ? 'day' : 'days'} after last email`
  }
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} after last email`
}

function toDelayEditor(hours: number): { value: number; unit: DelayUnit } {
  if (hours > 0 && hours % 24 === 0) return { value: hours / 24, unit: 'days' }
  return { value: hours, unit: 'hours' }
}

const DELAY_UNITS: DelayUnit[] = ['hours', 'days']

function DelayUnitSelect({
  value,
  onChange,
}: {
  value: DelayUnit
  onChange: (unit: DelayUnit) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  return (
    <div className="relative w-[108px] shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="body-4 text-muted-foreground hover:text-foreground h-spacing-8 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-foreground capitalize">{value}</span>
        <ChevronDown className="icon-sm shrink-0 opacity-60" />
      </button>
      {open ? (
        <div className="mt-spacing-1 z-dropdown absolute left-0 top-full w-full min-w-[108px]">
          <div className="dropdown-menu-solid p-spacing-1">
            {DELAY_UNITS.map((unit) => {
              const isSelected = value === unit
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange(unit)
                    setOpen(false)
                  }}
                  className={`gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 body-3 flex w-full items-center justify-between text-left transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-muted-foreground'
                      : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-foreground font-medium capitalize">{unit}</span>
                  {isSelected ? <Check className="icon-sm text-primary shrink-0" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface SequenceEmailEditorCardProps {
  email: SequenceEmailCardData
  index: number
  onBodyChange: (emailId: string, html: string) => void
  onEmailSettingsChange: (
    emailId: string,
    patch: Partial<Pick<SequenceEmailCardData, 'status' | 'delay_hours' | 'subject'>>,
  ) => void
  saveStatus: SequenceEmailEditorSaveStatus
}

export function SequenceEmailEditorCard({
  email,
  index,
  onBodyChange,
  onEmailSettingsChange,
  saveStatus,
}: SequenceEmailEditorCardProps) {
  const [isDelayDropdownOpen, setIsDelayDropdownOpen] = useState(false)
  const delayDropdownRef = useRef<HTMLDivElement | null>(null)
  const [{ value: delayValue, unit: delayUnit }, setDelayEditor] = useState(
    toDelayEditor(email.delay_hours),
  )

  useEffect(() => {
    setDelayEditor(toDelayEditor(email.delay_hours))
  }, [email.id, email.delay_hours])

  useEffect(() => {
    if (!isDelayDropdownOpen) return
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (delayDropdownRef.current?.contains(target)) return
      setIsDelayDropdownOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isDelayDropdownOpen])

  const applyDelay = (nextValue: number, nextUnit: DelayUnit) => {
    const normalizedValue = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
    const delayHours = nextUnit === 'days' ? normalizedValue * 24 : normalizedValue
    onEmailSettingsChange(email.id, { delay_hours: delayHours })
  }

  return (
    <div className="card-glass rounded-spacing-4 flex h-full min-h-0 flex-col">
      <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex items-start border-b">
        <div className="min-w-0 flex-1">
          <InlineEditableArtifactTitle
            value={email.subject ?? ''}
            placeholder={`Email ${index + 1}`}
            onCommit={(next) => onEmailSettingsChange(email.id, { subject: next })}
          />

          <div className="mt-spacing-2 gap-spacing-3 flex w-full flex-wrap items-center justify-between">
            <div className="gap-spacing-2 flex shrink-0 items-center">
              <span className="body-3 text-muted-foreground shrink-0">Send</span>
              <div className="relative" ref={delayDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDelayDropdownOpen((prev) => !prev)}
                  className="body-3 text-muted-foreground hover:text-foreground h-spacing-8 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-2 hover:bg-hover-subtle inline-flex min-w-[168px] max-w-full items-center justify-between border text-left transition-colors"
                  aria-expanded={isDelayDropdownOpen}
                  aria-haspopup="dialog"
                >
                  <span className={`truncate ${email.delay_hours > 0 ? 'text-foreground' : ''}`}>
                    {getDelayDisplay(email.delay_hours)}
                  </span>
                  <ChevronDown className="icon-sm shrink-0 opacity-60" />
                </button>

                {isDelayDropdownOpen ? (
                  <div className="mt-spacing-1 z-dropdown absolute left-0 top-full">
                    <div className="dropdown-menu-solid p-spacing-2">
                      <div className="gap-spacing-2 flex items-center whitespace-nowrap">
                        <span className="body-3 text-muted-foreground shrink-0">Send email</span>
                        <input
                          type="number"
                          min={0}
                          value={delayValue}
                          onChange={(event) => {
                            const nextValue = Math.max(
                              0,
                              Number.parseInt(event.target.value || '0', 10) || 0,
                            )
                            setDelayEditor((prev) => ({ ...prev, value: nextValue }))
                            applyDelay(nextValue, delayUnit)
                          }}
                          className="body-3 h-spacing-8 rounded-spacing-2 border-border bg-background text-foreground px-spacing-2 w-12 shrink-0 border text-center [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label="Delay amount"
                        />
                        <DelayUnitSelect
                          value={delayUnit}
                          onChange={(nextUnit) => {
                            setDelayEditor((prev) => ({ ...prev, unit: nextUnit }))
                            applyDelay(delayValue, nextUnit)
                          }}
                        />
                        <span className="body-3 text-foreground shrink-0">after last email</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="gap-spacing-2 flex items-center">
              <span className="body-4 text-muted-foreground">Published</span>
              <Switch
                checked={email.status === 'ready'}
                onCheckedChange={(checked) =>
                  onEmailSettingsChange(email.id, { status: checked ? 'ready' : 'draft' })
                }
              />
            </div>
          </div>
        </div>

        <SaveIndicator status={saveStatus} />
      </div>

      <div className="min-h-0 flex-1">
        <EmailPreviewEditor
          content={email.body ?? ''}
          onContentChange={(html) => onBodyChange(email.id, html)}
          placeholder="Start writing your email..."
          className="h-full rounded-none border-0"
        />
      </div>
    </div>
  )
}
