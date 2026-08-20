'use client'

import { ChevronDown, MoreVertical, Plus } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { NEW_BTN_CLASS } from '../constants'
import type { ProductWithPrices } from '../types'
import { fmtPrice } from '../utils/financeFormatters'

interface Props {
  productsOpen: boolean
  setProductsOpen: (value: boolean | ((v: boolean) => boolean)) => void
  objectsLoading: boolean
  products: ProductWithPrices[]
  renameProductId: string | null
  renameProductValue: string
  setRenameProductId: (id: string | null) => void
  setRenameProductValue: (value: string) => void
  setProductMenuPos: (pos: { top: number; left: number }) => void
  productMenuId: string | null
  setProductMenuId: (id: string | null) => void
  setAddPriceProductId: (id: string) => void
  setShowAddPriceModal: (open: boolean) => void
  setDetailProduct: (product: ProductWithPrices) => void
  handleRenameProduct: (productId: string, newName: string) => Promise<void>
  setShowNewProductModal: (open: boolean) => void
  hideNewButton?: boolean
  filterQuery?: string
}

export function ProductsSection({
  productsOpen,
  setProductsOpen,
  objectsLoading,
  products,
  renameProductId,
  renameProductValue,
  setRenameProductId,
  setRenameProductValue,
  setProductMenuPos,
  productMenuId,
  setProductMenuId,
  setAddPriceProductId,
  setShowAddPriceModal,
  setDetailProduct,
  handleRenameProduct,
  setShowNewProductModal,
  hideNewButton = false,
  filterQuery = '',
}: Props) {
  const fq = filterQuery.trim().toLowerCase()
  const productsFiltered = fq
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(fq) || (p.description ?? '').toLowerCase().includes(fq),
      )
    : products

  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setProductsOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <ChevronDown
            className={`text-muted-foreground h-4 w-4 transition-transform ${productsOpen ? '' : '-rotate-90'}`}
          />
          <div className="text-left">
            <p className="body-2 text-foreground font-semibold">
              {`Products (${productsFiltered.length}${fq && products.length !== productsFiltered.length ? ` / ${products.length}` : ''})`}
            </p>
            <p className="body-4 text-muted-foreground mt-0.5">Tagged to this campaign in Stripe</p>
          </div>
        </button>
        {!hideNewButton ? (
          <button
            type="button"
            onClick={() => setShowNewProductModal(true)}
            className={NEW_BTN_CLASS}
          >
            <Plus className="h-3.5 w-3.5" /> New Product
          </button>
        ) : null}
      </div>

      {productsOpen && (
        <div className="mt-4">
          {objectsLoading ? (
            <ListSkeleton rows={3} label="Loading..." />
          ) : products.length === 0 ? (
            <p className="body-4 text-muted-foreground">No products yet.</p>
          ) : productsFiltered.length === 0 ? (
            <p className="body-4 text-muted-foreground">No products match your search.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {productsFiltered.map((product) => {
                const allPrices = product.prices ?? []
                const visiblePrices = allPrices.slice(0, 3)
                const hasMore = allPrices.length > 3
                return (
                  <div
                    key={product.id}
                    className="relative flex flex-col rounded-xl border border-white/5 bg-surface-subtle p-4"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        {renameProductId === product.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              void handleRenameProduct(product.id, renameProductValue)
                            }}
                            className="flex gap-1"
                          >
                            <input
                              autoFocus
                              value={renameProductValue}
                              onChange={(e) => setRenameProductValue(e.target.value)}
                              className="body-3 text-foreground border-primary/50 w-full border-b bg-transparent font-medium outline-none"
                              onBlur={() => {
                                setRenameProductId(null)
                                setRenameProductValue('')
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setRenameProductId(null)
                                  setRenameProductValue('')
                                }
                              }}
                            />
                          </form>
                        ) : (
                          <p className="body-3 text-foreground truncate font-medium">
                            {product.name}
                          </p>
                        )}
                        {product.description && (
                          <p className="body-4 text-muted-foreground mt-0.5 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        data-product-menu-trigger
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setProductMenuPos({ top: rect.bottom + 4, left: rect.right })
                          setProductMenuId(productMenuId === product.id ? null : product.id)
                        }}
                        aria-label="Product actions"
                        title="Product actions"
                        className="rounded-spacing-1 text-muted-foreground hover:text-foreground flex h-6 w-6 shrink-0 items-center justify-center transition-colors"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {product.pricesLoading ? (
                      <div className="mt-3">
                        <ListSkeleton rows={3} label="Loading prices..." />
                      </div>
                    ) : visiblePrices.length > 0 ? (
                      <table className="mt-3 w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="body-4 text-muted-foreground pb-1 text-left font-medium">
                              Type
                            </th>
                            <th className="body-4 text-muted-foreground pb-1 text-right font-medium">
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visiblePrices.map((price) => (
                            <tr key={price.id} className="border-b border-white/5 last:border-0">
                              <td className="body-4 text-muted-foreground py-1">
                                {price.recurring ? `${price.recurring.interval}` : 'One-time'}
                              </td>
                              <td className="body-3 text-foreground py-1 text-right font-medium">
                                {fmtPrice(price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="body-4 text-muted-foreground mt-3">No prices yet.</p>
                    )}

                    <div className="mt-auto flex gap-1.5 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAddPriceProductId(product.id)
                          setShowAddPriceModal(true)
                        }}
                        className="chip-glass-neutral body-4 text-muted-foreground hover:text-foreground flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1"
                      >
                        <Plus className="h-3 w-3" /> Add Price
                      </button>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setDetailProduct(product)}
                          className="chip-glass-neutral body-4 text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-lg px-2 py-1"
                        >
                          Show more
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
