'use client'

import { AlertCircle } from 'lucide-react'

export interface InlineErrorProps {
  message: string
  className?: string
  showIcon?: boolean
}

export function InlineError({ message, className = '', showIcon = true }: InlineErrorProps) {
  return (
    <div
      className={`rounded-spacing-2 border-destructive/20 bg-destructive/10 p-spacing-3 border ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="gap-spacing-2 flex items-start">
        {showIcon && <AlertCircle className="icon-sm text-destructive mt-0.5 flex-shrink-0" />}
        <p className="body-3 text-destructive break-words">{message}</p>
      </div>
    </div>
  )
}
