'use client'

import type { FormEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { CURRENCY_OPTIONS, INPUT_CLASS, LABEL_CLASS } from '../../constants'
import type { ProductWithPrices } from '../../types'
import { FormSelectDropdown } from '../FormSelectDropdown'

interface Props {
  open: boolean
  saving: boolean
  setOpen: (open: boolean) => void
  addPriceProductId: string | null
  setAddPriceProductId: (id: string | null) => void
  products: ProductWithPrices[]
  onSubmit: (e: FormEvent) => void
  form: {
    addPriceAmount: string
    setAddPriceAmount: (value: string) => void
    addPriceCurrency: string
    setAddPriceCurrency: (value: string) => void
    addPriceInterval: '' | 'month' | 'year' | 'week'
    setAddPriceInterval: (value: '' | 'month' | 'year' | 'week') => void
    resetAddPriceForm: () => void
  }
}

export function AddPriceModal({
  open,
  saving,
  setOpen,
  addPriceProductId,
  setAddPriceProductId,
  products,
  onSubmit,
  form,
}: Props) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(openState) => {
        if (!openState) {
          form.resetAddPriceForm()
          setOpen(false)
          setAddPriceProductId(null)
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
            <DialogPrimitive.Title>Add Price</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">Add Price</h2>
                  <button
                    onClick={() => {
                      form.resetAddPriceForm()
                      setOpen(false)
                      setAddPriceProductId(null)
                    }}
                    className="btn-icon-bare"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Add a price to{' '}
                  {products.find((p) => p.id === addPriceProductId)?.name ?? 'this product'}
                </p>
              </div>
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <form id="form-add-price" onSubmit={onSubmit} className="space-y-spacing-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>Amount *</label>
                      <input
                        value={form.addPriceAmount}
                        onChange={(e) => form.setAddPriceAmount(e.target.value)}
                        placeholder="e.g. 97"
                        className={INPUT_CLASS}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <FormSelectDropdown
                      label="Currency"
                      value={form.addPriceCurrency}
                      onChange={form.setAddPriceCurrency}
                      options={CURRENCY_OPTIONS}
                    />
                  </div>
                  <FormSelectDropdown
                    label="Billing"
                    value={form.addPriceInterval}
                    onChange={(v) => form.setAddPriceInterval(v as '' | 'month' | 'year' | 'week')}
                    options={[
                      { value: '', label: 'One-time payment' },
                      { value: 'week', label: 'Weekly recurring' },
                      { value: 'month', label: 'Monthly recurring' },
                      { value: 'year', label: 'Annual recurring' },
                    ]}
                  />
                </form>
              </div>
              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                <button
                  type="button"
                  onClick={() => {
                    form.resetAddPriceForm()
                    setOpen(false)
                    setAddPriceProductId(null)
                  }}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="form-add-price"
                  disabled={saving || !form.addPriceAmount}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Price'}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
