'use client'

import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Copy, Pencil, Trash2 } from 'lucide-react'
import type { ProductWithPrices } from '../types'

interface Props {
  productMenuId: string | null
  productMenuPos: { top: number; left: number }
  productMenuDropRef: RefObject<HTMLDivElement | null>
  products: ProductWithPrices[]
  setProductMenuId: (id: string | null) => void
  setRenameProductValue: (value: string) => void
  setRenameProductId: (id: string | null) => void
  handleArchiveProduct: (id: string) => Promise<void>
  handleDeleteProduct: (id: string) => Promise<void>
}

export function ProductMenuPortal({
  productMenuId,
  productMenuPos,
  productMenuDropRef,
  products,
  setProductMenuId,
  setRenameProductValue,
  setRenameProductId,
  handleArchiveProduct,
  handleDeleteProduct,
}: Props) {
  if (!productMenuId || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={productMenuDropRef}
      data-dropdown
      className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 fixed min-w-44"
      style={{
        top: productMenuPos.top,
        left: productMenuPos.left,
        transform: 'translateX(-100%)',
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(productMenuId)
          setProductMenuId(null)
        }}
        className="body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center gap-2 text-left"
      >
        <Copy className="h-3.5 w-3.5" /> Copy ID
      </button>
      <button
        type="button"
        onClick={() => {
          const p = products.find((pr) => pr.id === productMenuId)
          setRenameProductValue(p?.name ?? '')
          setRenameProductId(productMenuId)
          setProductMenuId(null)
        }}
        className="body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center gap-2 text-left"
      >
        <Pencil className="h-3.5 w-3.5" /> Rename
      </button>
      <button
        type="button"
        onClick={() => {
          const id = productMenuId
          setProductMenuId(null)
          void handleArchiveProduct(id)
        }}
        className="body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center gap-2 text-left"
      >
        <Archive className="h-3.5 w-3.5" /> Archive Product
      </button>
      <button
        type="button"
        onClick={() => {
          const id = productMenuId
          setProductMenuId(null)
          void handleDeleteProduct(id)
        }}
        className="body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center gap-2 text-left text-red-400 hover:bg-red-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete Product
      </button>
    </div>,
    document.body,
  )
}
