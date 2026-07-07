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
  form: {
    newCouponCode: string
    setNewCouponCode: (value: string) => void
    newCouponName: string
    setNewCouponName: (value: string) => void
    newCouponType: 'percent' | 'amount'
    setNewCouponType: (value: 'percent' | 'amount') => void
    newCouponValue: string
    setNewCouponValue: (value: string) => void
    newCouponCurrency: string
    setNewCouponCurrency: (value: string) => void
    newCouponDuration: 'once' | 'forever' | 'repeating'
    setNewCouponDuration: (value: 'once' | 'forever' | 'repeating') => void
    newCouponDurationMonths: string
    setNewCouponDurationMonths: (value: string) => void
    newCouponMaxUses: string
    setNewCouponMaxUses: (value: string) => void
    resetCouponForm: () => void
  }
}

export function NewCouponModal({ open, saving, setOpen, onSubmit, form }: Props) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(openState) => {
        if (!openState) {
          form.resetCouponForm()
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
            <DialogPrimitive.Title>New Coupon</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">New Coupon</h2>
                  <button
                    onClick={() => {
                      form.resetCouponForm()
                      setOpen(false)
                    }}
                    className="btn-icon-bare"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Create a discount code for this campaign
                </p>
              </div>

              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <form id="form-new-coupon" onSubmit={onSubmit} className="space-y-spacing-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>Code</label>
                      <input
                        value={form.newCouponCode}
                        onChange={(e) => form.setNewCouponCode(e.target.value.toUpperCase())}
                        placeholder="e.g. LAUNCH20"
                        className={`${INPUT_CLASS} font-mono`}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Display Name</label>
                      <input
                        value={form.newCouponName}
                        onChange={(e) => form.setNewCouponName(e.target.value)}
                        placeholder="Optional"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Discount Type</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => form.setNewCouponType('percent')}
                        className={`body-4 rounded-spacing-2 flex-1 px-3 py-2 transition-colors ${
                          form.newCouponType === 'percent'
                            ? 'chip-glass-blue text-foreground'
                            : 'chip-glass-neutral text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        % Off
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setNewCouponType('amount')}
                        className={`body-4 rounded-spacing-2 flex-1 px-3 py-2 transition-colors ${
                          form.newCouponType === 'amount'
                            ? 'chip-glass-blue text-foreground'
                            : 'chip-glass-neutral text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Amount Off
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS}>Value *</label>
                      <input
                        value={form.newCouponValue}
                        onChange={(e) => form.setNewCouponValue(e.target.value)}
                        placeholder={form.newCouponType === 'percent' ? '20' : '50'}
                        type="number"
                        min="0"
                        step={form.newCouponType === 'percent' ? '1' : '0.01'}
                        className={INPUT_CLASS}
                        required
                      />
                    </div>
                    {form.newCouponType === 'amount' && (
                      <FormSelectDropdown
                        label="Currency"
                        value={form.newCouponCurrency}
                        onChange={form.setNewCouponCurrency}
                        options={[
                          { value: 'usd', label: 'USD' },
                          { value: 'eur', label: 'EUR' },
                          { value: 'gbp', label: 'GBP' },
                          { value: 'aud', label: 'AUD' },
                        ]}
                      />
                    )}
                  </div>
                  <FormSelectDropdown
                    label="Duration"
                    value={form.newCouponDuration}
                    onChange={(v) =>
                      form.setNewCouponDuration(v as 'once' | 'forever' | 'repeating')
                    }
                    options={[
                      { value: 'once', label: 'Once' },
                      { value: 'forever', label: 'Forever' },
                      { value: 'repeating', label: 'Repeating' },
                    ]}
                  />
                  {form.newCouponDuration === 'repeating' && (
                    <div>
                      <label className={LABEL_CLASS}>Duration in Months</label>
                      <input
                        value={form.newCouponDurationMonths}
                        onChange={(e) => form.setNewCouponDurationMonths(e.target.value)}
                        placeholder="e.g. 3"
                        type="number"
                        min="1"
                        className={INPUT_CLASS}
                      />
                    </div>
                  )}
                  <div>
                    <label className={LABEL_CLASS}>Max Uses</label>
                    <input
                      value={form.newCouponMaxUses}
                      onChange={(e) => form.setNewCouponMaxUses(e.target.value)}
                      placeholder="Unlimited if empty"
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
                    form.resetCouponForm()
                    setOpen(false)
                  }}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="form-new-coupon"
                  disabled={saving || !form.newCouponValue}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
