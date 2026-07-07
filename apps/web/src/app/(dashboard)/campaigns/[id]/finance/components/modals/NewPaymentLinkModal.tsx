'use client'

import type { FormEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { INPUT_CLASS, LABEL_CLASS } from '../../constants'
import { FormSelectDropdown } from '../FormSelectDropdown'

interface Props {
  open: boolean
  saving: boolean
  setOpen: (open: boolean) => void
  onSubmit: (e: FormEvent) => void
  priceOptions: Array<{ priceId: string; label: string }>
  productsHaveLoadingPrices: boolean
  form: {
    newLinkPriceId: string
    setNewLinkPriceId: (value: string) => void
    newLinkQuantity: string
    setNewLinkQuantity: (value: string) => void
    resetLinkForm: () => void
  }
}

export function NewPaymentLinkModal({
  open,
  saving,
  setOpen,
  onSubmit,
  priceOptions,
  productsHaveLoadingPrices,
  form,
}: Props) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(openState) => {
        if (!openState) {
          form.resetLinkForm()
          setOpen(false)
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement)?.closest?.('[data-dropdown]')) e.preventDefault()
          }}
          className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2"
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>New Payment Link</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">New Payment Link</h2>
                  <button
                    onClick={() => {
                      form.resetLinkForm()
                      setOpen(false)
                    }}
                    className="btn-icon-bare"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Create a shareable checkout link
                </p>
              </div>

              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <form id="form-new-link" onSubmit={onSubmit} className="space-y-spacing-4">
                  <FormSelectDropdown
                    label="Price *"
                    value={form.newLinkPriceId}
                    onChange={form.setNewLinkPriceId}
                    options={priceOptions.map((o) => ({ value: o.priceId, label: o.label }))}
                    placeholder={
                      priceOptions.length === 0
                        ? productsHaveLoadingPrices
                          ? 'Loading prices...'
                          : 'No prices available'
                        : 'Select a price'
                    }
                    disabled={priceOptions.length === 0}
                    required
                    formId="form-new-link"
                  />
                  <div>
                    <label className={LABEL_CLASS}>Quantity</label>
                    <input
                      value={form.newLinkQuantity}
                      onChange={(e) => form.setNewLinkQuantity(e.target.value)}
                      placeholder="1"
                      type="number"
                      min="1"
                      className={INPUT_CLASS}
                    />
                  </div>
                </form>
              </div>
              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={() => {
                    form.resetLinkForm()
                    setOpen(false)
                  }}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="form-new-link"
                  disabled={saving || !form.newLinkPriceId.trim()}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Link'}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
