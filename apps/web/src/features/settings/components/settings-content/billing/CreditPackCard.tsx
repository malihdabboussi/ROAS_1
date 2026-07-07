'use client'

import { Loader2, Zap } from 'lucide-react'
import type { CreditPack } from '@/features/settings/types/billing.types'

interface CreditPackCardProps {
  pack: CreditPack
  onBuy: (packSlug: string) => void
  loading?: boolean
}

export default function CreditPackCard({ pack, onBuy, loading }: CreditPackCardProps) {
  const formatCredits = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : n.toString()

  const perCredit = ((pack.price / pack.credits) * 1000).toFixed(2)

  return (
    <div className="section-card rounded-spacing-3 p-spacing-4 hover:border-muted-foreground/40 flex flex-col transition-all">
      <div className="mb-spacing-3 gap-spacing-2 flex items-center">
        <div className="rounded-spacing-2 bg-secondary flex h-8 w-8 items-center justify-center">
          <Zap className="h-4 w-4" style={{ color: '#eab308' }} />
        </div>
        <span className="body-1 text-foreground font-semibold">{pack.name}</span>
      </div>

      <div className="mb-spacing-1 flex items-baseline gap-1">
        <span className="text-foreground text-2xl font-bold">${pack.price}</span>
      </div>

      <p className="body-2 text-primary font-medium">{formatCredits(pack.credits)} credits</p>

      <p className="body-3 mt-spacing-1 mb-spacing-4 text-muted-foreground">
        ${perCredit} per 1K credits
      </p>

      <button
        onClick={() => onBuy(pack.slug)}
        disabled={loading}
        className="body-2 gap-spacing-2 rounded-spacing-2 bg-secondary py-spacing-2 text-foreground hover:bg-secondary/80 flex w-full items-center justify-center font-medium transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buy Credits'}
      </button>
    </div>
  )
}
