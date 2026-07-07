'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface AutomationToggleChipProps {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  size?: 'default' | 'compact' | 'field'
}

export function AutomationToggleChip({
  selected,
  onClick,
  children,
  className,
  size = 'default',
}: AutomationToggleChipProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'rounded-spacing-2 font-medium transition-colors',
        size === 'default' && 'body-4 px-spacing-3 py-spacing-1.5',
        size === 'compact' &&
          'typo-caption gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex items-center',
        size === 'field' && 'body-3 h-spacing-10 px-spacing-3 inline-flex items-center',
        selected
          ? 'chip-glass-blue text-foreground'
          : 'chip-glass-neutral text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}
