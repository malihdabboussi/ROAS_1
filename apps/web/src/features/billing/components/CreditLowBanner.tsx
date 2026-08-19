'use client'

import { useState } from 'react'
import { AlertTriangle, X, Zap } from 'lucide-react'

interface CreditLowBannerProps {
  remaining: number
  total: number
  onBuyCredits: () => void
  onUpgrade: () => void
}

/**
 * Warning banner shown when credits are running low.
 * Appears at < 20% remaining. Becomes urgent (red) at < 5%.
 */
export function CreditLowBanner({
  remaining,
  total,
  onBuyCredits,
  onUpgrade,
}: CreditLowBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || total === 0) return null

  const ratio = remaining / total
  if (ratio >= 0.2) return null

  const isUrgent = ratio < 0.05
  const borderColor = isUrgent ? 'border-red-500/30' : 'border-amber-500/30'
  const bgColor = isUrgent ? 'bg-red-500/5' : 'bg-amber-500/5'
  const iconColor = isUrgent ? 'text-destructive' : 'text-amber-400'

  return (
    <div
      className={`gap-spacing-3 rounded-spacing-3 p-spacing-3 flex items-center border ${borderColor} ${bgColor}`}
    >
      <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="body-3 text-foreground font-medium">
          {isUrgent
            ? `Only ${remaining.toLocaleString()} credits left!`
            : `Credits running low — ${remaining.toLocaleString()} remaining`}
        </p>
      </div>
      <div className="gap-spacing-2 flex flex-shrink-0 items-center">
        <button
          onClick={onBuyCredits}
          className="body-3 gap-spacing-1 rounded-spacing-2 bg-secondary px-spacing-3 text-foreground hover:bg-secondary/80 flex items-center py-1.5 font-medium transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          Buy Credits
        </button>
        <button
          onClick={onUpgrade}
          className="body-3 rounded-spacing-2 bg-primary px-spacing-3 text-background py-1.5 font-medium transition-opacity hover:opacity-90"
        >
          Upgrade
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-1 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
