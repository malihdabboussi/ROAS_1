'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  CallBookingFunnelTypeMockup,
  CustomFunnelTypeMockup,
  LeadMagnetFunnelTypeMockup,
  VslFunnelTypeMockup,
  WebinarFunnelTypeMockup,
} from './FunnelTypeMockups'

export type CreateFunnelType = 'lead-magnet' | 'call-booking' | 'webinar' | 'vsl' | 'custom'

const FUNNEL_TYPE_OPTIONS: ReadonlyArray<{
  type: CreateFunnelType
  label: string
  description: string
  mockup: ReactNode
}> = [
  {
    type: 'lead-magnet',
    label: 'Lead magnet',
    description: 'Opt-in, offer, and thank-you pages to capture leads.',
    mockup: <LeadMagnetFunnelTypeMockup />,
  },
  {
    type: 'call-booking',
    label: 'Call booking',
    description: 'Book strategy calls or discovery sessions.',
    mockup: <CallBookingFunnelTypeMockup />,
  },
  {
    type: 'webinar',
    label: 'Webinar',
    description: 'Registration and replay pages for live events.',
    mockup: <WebinarFunnelTypeMockup />,
  },
  {
    type: 'vsl',
    label: 'VSL',
    description: 'Video sales letter with a single conversion path.',
    mockup: <VslFunnelTypeMockup />,
  },
  {
    type: 'custom',
    label: 'Custom',
    description: 'Start blank and build any funnel flow you need.',
    mockup: <CustomFunnelTypeMockup />,
  },
]

export interface CreateFunnelTypeModalProps {
  open: boolean
  onClose: () => void
  onSelect: (funnelType: CreateFunnelType) => void | Promise<void>
  submitting?: boolean
}

export function CreateFunnelTypeModal({
  open,
  onClose,
  onSelect,
  submitting = false,
}: CreateFunnelTypeModalProps) {
  const [pendingType, setPendingType] = useState<CreateFunnelType | null>(null)

  useEffect(() => {
    if (!open) setPendingType(null)
  }, [open])

  if (!open) return null

  const busy = submitting || pendingType !== null

  const handlePick = (type: CreateFunnelType) => {
    if (busy) return
    setPendingType(type)
    void Promise.resolve(onSelect(type)).finally(() => setPendingType(null))
  }

  return (
    <>
      <div
        className="z-modal-backdrop fixed inset-0 bg-modal-overlay"
        onClick={busy ? undefined : onClose}
      />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn-icon-bare btn-close-absolute"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>

          <div className="px-spacing-6 pt-spacing-6 pb-spacing-4 border-border border-b">
            <h2 className="title-h6 text-foreground pr-spacing-8">Choose funnel type</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Pick a starting template. You can change pages and layout after creation.
            </p>
          </div>

          <div className="px-spacing-4 py-spacing-4 sm:px-spacing-6 overflow-y-auto">
            <div className="gap-spacing-3 grid sm:grid-cols-2">
              {FUNNEL_TYPE_OPTIONS.map((option) => {
                const isPending = pendingType === option.type
                return (
                  <button
                    key={option.type}
                    type="button"
                    disabled={busy}
                    onClick={() => handlePick(option.type)}
                    className="card-glass rounded-spacing-3 hover:border-primary/40 gap-spacing-3 p-spacing-4 group flex flex-col border text-left transition-colors hover:bg-[var(--color-hover-subtle)] disabled:pointer-events-none disabled:opacity-50"
                  >
                    <div className="bg-muted/30 rounded-spacing-2 flex min-h-[7.5rem] items-center justify-center overflow-hidden">
                      {option.mockup}
                    </div>
                    <div className="space-y-spacing-0.5">
                      <p className="body-2 text-foreground font-semibold">{option.label}</p>
                      <p className="body-3 text-muted-foreground">{option.description}</p>
                    </div>
                    {isPending ? (
                      <p className="typo-caption text-muted-foreground">Creating…</p>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
