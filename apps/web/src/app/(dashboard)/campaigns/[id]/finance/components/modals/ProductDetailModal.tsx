'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Plus, X } from 'lucide-react'
import { NEW_BTN_CLASS } from '../../constants'
import type { ProductWithPrices } from '../../types'
import { fmtPrice } from '../../utils/financeFormatters'

interface Props {
  detailProduct: ProductWithPrices | null
  setDetailProduct: (product: ProductWithPrices | null) => void
  setAddPriceProductId: (id: string) => void
  setShowAddPriceModal: (open: boolean) => void
}

export function ProductDetailModal({
  detailProduct,
  setDetailProduct,
  setAddPriceProductId,
  setShowAddPriceModal,
}: Props) {
  return (
    <DialogPrimitive.Root
      open={!!detailProduct}
      onOpenChange={(openState) => {
        if (!openState) setDetailProduct(null)
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
            <DialogPrimitive.Title>{detailProduct?.name ?? 'Product'}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">{detailProduct?.name}</h2>
                  <button onClick={() => setDetailProduct(null)} className="btn-icon-bare">
                    <X className="icon-xs" />
                  </button>
                </div>
                {detailProduct?.description && (
                  <p className="body-3 text-muted-foreground mt-spacing-1">
                    {detailProduct.description}
                  </p>
                )}
                <p className="body-4 text-muted-foreground mt-spacing-1 font-mono text-xs opacity-60">
                  {detailProduct?.id}
                </p>
              </div>

              <div className="px-spacing-6 py-spacing-4 flex-1 overflow-y-auto">
                <div className="mb-3 flex items-center justify-between">
                  <p className="body-2 text-foreground font-semibold">
                    Prices ({detailProduct?.prices?.length ?? 0})
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (detailProduct) {
                        setAddPriceProductId(detailProduct.id)
                        setShowAddPriceModal(true)
                      }
                    }}
                    className={NEW_BTN_CLASS}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Price
                  </button>
                </div>
                {(detailProduct?.prices ?? []).length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="body-4 text-muted-foreground pb-1.5 text-left font-medium">
                          Type
                        </th>
                        <th className="body-4 text-muted-foreground pb-1.5 text-right font-medium">
                          Price
                        </th>
                        <th className="body-4 text-muted-foreground pb-1.5 text-right font-medium">
                          ID
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailProduct?.prices ?? []).map((price) => (
                        <tr key={price.id} className="border-b border-white/5 last:border-0">
                          <td className="body-4 text-muted-foreground py-2">
                            {price.recurring
                              ? `Recurring / ${price.recurring.interval}`
                              : 'One-time'}
                            {price.nickname ? ` · ${price.nickname}` : ''}
                          </td>
                          <td className="body-3 text-foreground py-2 text-right font-medium">
                            {fmtPrice(price)}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard.writeText(price.id)}
                              className="text-muted-foreground font-mono text-xs opacity-60 hover:opacity-100"
                              title="Copy price ID"
                            >
                              {price.id.slice(0, 18)}…
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="body-4 text-muted-foreground">No prices yet.</p>
                )}
              </div>
              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-end border-t">
                <button
                  type="button"
                  onClick={() => setDetailProduct(null)}
                  className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
