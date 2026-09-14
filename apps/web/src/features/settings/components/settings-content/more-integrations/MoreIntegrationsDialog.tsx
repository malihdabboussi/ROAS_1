'use client'

import { useCallback, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowLeft, X } from 'lucide-react'
import type { IntegrationTypeCard } from './integration-type-cards'
import { IntegrationTypeCards } from './IntegrationTypeCards'
import { NoteTakerDefinitionForm } from './NoteTakerDefinitionForm'
import { useNoteTakerDefinitionForm } from './use-note-taker-definition-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a definition is saved; the Library refreshes and shows the new row. */
  onCreated: (created: { slug: string; displayName: string }) => void
}

type Step = 'type' | 'note_taker'

/**
 * "More integrations": pick an integration type, then describe the tool.
 * Platform admins only (the button is hidden for everyone else; the API
 * enforces the role again).
 */
export function MoreIntegrationsDialog({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState<Step>('type')
  const handleCreated = useCallback(
    (created: { slug: string; displayName: string }) => {
      onCreated(created)
      onOpenChange(false)
    },
    [onCreated, onOpenChange],
  )
  const form = useNoteTakerDefinitionForm(handleCreated)

  const close = (next: boolean) => {
    if (!next) {
      setStep('type')
      form.reset()
    }
    onOpenChange(next)
  }

  const selectType = (card: IntegrationTypeCard) => {
    if (card.id === 'note_taker') setStep('note_taker')
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={close}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border">
            <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="gap-spacing-2 flex min-w-0 flex-1 items-start">
                  {step === 'note_taker' ? (
                    <button
                      type="button"
                      onClick={() => setStep('type')}
                      className="btn-icon-bare shrink-0"
                      aria-label="Back to integration types"
                    >
                      <ArrowLeft className="icon-xs" />
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <DialogPrimitive.Title className="title-h6 text-foreground">
                      {step === 'type' ? 'More integrations' : 'Add a note taker'}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                      {step === 'type'
                        ? 'Pick the kind of tool to add. It appears in the Library for everyone once saved.'
                        : 'Describe how the tool delivers meetings. Test it with a sample before saving.'}
                    </DialogPrimitive.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="btn-icon-bare shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
              {step === 'type' ? (
                <IntegrationTypeCards onSelect={selectType} />
              ) : (
                <NoteTakerDefinitionForm form={form} />
              )}
            </div>

            {step === 'note_taker' ? (
              <div className="border-border px-spacing-6 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-between border-t">
                <p className="body-4 text-destructive min-w-0 flex-1">{form.submitError ?? ''}</p>
                <div className="gap-spacing-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void form.submit()}
                    disabled={form.submitting}
                    className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
                  >
                    {form.submitting ? 'Saving…' : 'Save note taker'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
