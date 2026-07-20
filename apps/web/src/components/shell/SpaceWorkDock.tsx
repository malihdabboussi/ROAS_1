'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type SpaceWorkDockProps = {
  children: ReactNode
  className?: string
}

/** Space column beside chat. Collapse hides this dock; children stay mounted. */
export function SpaceWorkDock({ children, className }: SpaceWorkDockProps) {
  return (
    <div className={cn('shell-space-work-dock', className)}>
      <div className="shell-space-work-dock-body">{children}</div>
    </div>
  )
}
