'use client'

import type { FormEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ImageIcon, Trash2, X } from 'lucide-react'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { CURRENCY_OPTIONS, INPUT_CLASS, LABEL_CLASS } from '../../constants'
import { FormSelectDropdown } from '../FormSelectDropdown'

interface Props {
  open: boolean
  saving: boolean
  campaignId: string
  showMediaPicker: boolean
  setShowMediaPicker: (open: boolean) => void
  setOpen: (open: boolean) => void
  onSubmit: (e: FormEvent) => void
  form: {
    newProductName: string
    setNewProductName: (value: string) => void
    newProductDesc: string
    setNewProductDesc: (value: string) => void
    newProductImageUrl: string
    setNewProductImageUrl: (value: string) => void
    newProductCurrency: string
    setNewProductCurrency: (value: string) => void
    newProductPriceAmount: string
    setNewProductPriceAmount: (value: string) => void
    newProductRecurring: boolean
    setNewProductRecurring: (value: boolean) => void
    newProductInterval: 'month' | 'year' | 'week'
    setNewProductInterval: (value: 'month' | 'year' | 'week') => void
    newProductTaxBehavior: 'unspecified' | 'inclusive' | 'exclusive'
    setNewProductTaxBehavior: (value: 'unspecified' | 'inclusive' | 'exclusive') => void
    resetProductForm: () => void
  }
}

export function NewProductModal({
  open,
  saving,
  campaignId,
  showMediaPicker,
  setShowMediaPicker,
  setOpen,
  onSubmit,
  form,
}: Props) {
  return (
    <>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(openState) => {
          if (!openState) {
            form.resetProductForm()
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
              <DialogPrimitive.Title>New Product</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
              <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
                <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                  <div className="flex items-center justify-between">
                    <h2 className="title-h6">New Product</h2>
                    <button
                      onClick={() => {
                        form.resetProductForm()
                        setOpen(false)
                      }}
                      className="btn-icon-bare"
                    >
                      <X className="icon-xs" />
                    </button>
                  </div>
                  <p className="body-3 text-muted-foreground mt-spacing-1">
                    Create a Stripe product for this campaign
                  </p>
                </div>

                <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                  <form id="form-new-product" onSubmit={onSubmit} className="space-y-spacing-4">
                    <div>
                      <label className={LABEL_CLASS}>Name *</label>
                      <input
                        value={form.newProductName}
                        onChange={(e) => form.setNewProductName(e.target.value)}
                        placeholder="Product name"
                        className={INPUT_CLASS}
                        required
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Description</label>
                      <textarea
                        value={form.newProductDesc}
                        onChange={(e) => form.setNewProductDesc(e.target.value)}
                        placeholder="Optional description"
                        rows={3}
                        className={`${INPUT_CLASS} py-spacing-2 h-auto`}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Product Image</label>
                      {form.newProductImageUrl ? (
                        <div className="relative inline-block">
                          <img
                            src={form.newProductImageUrl}
                            alt="Product"
                            className="rounded-spacing-2 border-border h-24 w-24 border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => form.setNewProductImageUrl('')}
                            className="btn-icon-glass absolute -right-2 -top-2 h-6 w-6 rounded-full"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowMediaPicker(true)}
                          className="gap-spacing-2 rounded-spacing-2 border-border px-spacing-4 py-spacing-4 hover:border-primary/50 hover:bg-hover-subtle flex w-full items-center justify-center border border-dashed transition-colors"
                        >
                          <ImageIcon className="icon-sm text-muted-foreground" />
                          <span className="body-3 text-muted-foreground">
                            Choose from Media Library
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormSelectDropdown
                        label="Currency"
                        value={form.newProductCurrency}
                        onChange={form.setNewProductCurrency}
                        options={CURRENCY_OPTIONS}
                      />
                      <div>
                        <label className={LABEL_CLASS}>Price Amount</label>
                        <input
                          value={form.newProductPriceAmount}
                          onChange={(e) => form.setNewProductPriceAmount(e.target.value)}
                          placeholder="e.g. 97"
                          type="number"
                          min="0"
                          step="0.01"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                    {form.newProductPriceAmount && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL_CLASS}>Billing</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => form.setNewProductRecurring(false)}
                              className={`body-4 rounded-spacing-2 flex-1 px-3 py-2 transition-colors ${
                                !form.newProductRecurring
                                  ? 'chip-glass-blue text-foreground'
                                  : 'chip-glass-neutral text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              One-time
                            </button>
                            <button
                              type="button"
                              onClick={() => form.setNewProductRecurring(true)}
                              className={`body-4 rounded-spacing-2 flex-1 px-3 py-2 transition-colors ${
                                form.newProductRecurring
                                  ? 'chip-glass-blue text-foreground'
                                  : 'chip-glass-neutral text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              Recurring
                            </button>
                          </div>
                        </div>
                        {form.newProductRecurring && (
                          <FormSelectDropdown
                            label="Interval"
                            value={form.newProductInterval}
                            onChange={(v) =>
                              form.setNewProductInterval(v as 'month' | 'year' | 'week')
                            }
                            options={[
                              { value: 'week', label: 'Weekly' },
                              { value: 'month', label: 'Monthly' },
                              { value: 'year', label: 'Yearly' },
                            ]}
                          />
                        )}
                      </div>
                    )}
                    <FormSelectDropdown
                      label="Tax Behavior"
                      value={form.newProductTaxBehavior}
                      onChange={(v) =>
                        form.setNewProductTaxBehavior(
                          v as 'unspecified' | 'inclusive' | 'exclusive',
                        )
                      }
                      options={[
                        { value: 'unspecified', label: 'Unspecified' },
                        { value: 'inclusive', label: 'Inclusive' },
                        { value: 'exclusive', label: 'Exclusive' },
                      ]}
                    />
                  </form>
                </div>
                <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                  <button
                    type="button"
                    onClick={() => {
                      form.resetProductForm()
                      setOpen(false)
                    }}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="form-new-product"
                    disabled={saving || !form.newProductName.trim()}
                    className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Create Product'}
                  </button>
                </div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => form.setNewProductImageUrl(url)}
        campaignId={campaignId}
      />
    </>
  )
}
