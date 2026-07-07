'use client'

import type { RefObject } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { CampaignFinanceTabHandle } from '../reporting/FinanceOverviewView'

export type FinancePlusMenuProps = {
  open: boolean
  setOpen: (v: boolean) => void
  rootRef: RefObject<HTMLDivElement | null>
  financeOverviewRef: RefObject<CampaignFinanceTabHandle | null>
}

export function FinancePlusMenu({
  open,
  setOpen,
  rootRef,
  financeOverviewRef,
}: FinancePlusMenuProps) {
  return (
    <div ref={rootRef} className="relative">
      <Tooltip label="New product, link, or coupon" side="bottom">
        <span className="inline-flex">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            New
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </span>
      </Tooltip>
      {open ? (
        <div
          className="dropdown-menu-solid absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
            onClick={() => {
              setOpen(false)
              financeOverviewRef.current?.openNewProduct()
            }}
          >
            <Plus className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            New product
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
            onClick={() => {
              setOpen(false)
              financeOverviewRef.current?.openNewLink()
            }}
          >
            <Plus className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            New link
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
            onClick={() => {
              setOpen(false)
              financeOverviewRef.current?.openNewCoupon()
            }}
          >
            <Plus className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            New coupon
          </button>
        </div>
      ) : null}
    </div>
  )
}
