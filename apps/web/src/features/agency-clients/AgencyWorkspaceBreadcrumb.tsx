'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ShellBreadcrumb } from '@/components/shell/ShellBreadcrumb'
import { ShellHeaderAction } from '@/components/shell/ShellHeaderAction'

export function AgencyWorkspaceBreadcrumb({
  items,
  action,
}: {
  items: Array<{ href?: string; label: string }>
  action?: ReactNode
}) {
  const label = items.map((item) => item.label).join(' / ')
  const trail = (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center overflow-hidden">
      {items.map((item, index) => {
        const current = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center">
            {index > 0 ? (
              <span className="text-muted-foreground px-spacing-1 select-none">/</span>
            ) : null}
            {item.href && !current ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground body-3 truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground body-3 truncate font-medium">{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
  return (
    <>
      <ShellBreadcrumb label={label}>{trail}</ShellBreadcrumb>
      {action ? <ShellHeaderAction>{action}</ShellHeaderAction> : null}
    </>
  )
}
