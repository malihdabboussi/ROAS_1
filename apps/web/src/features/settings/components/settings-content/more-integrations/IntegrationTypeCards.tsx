'use client'

import {
  BarChart3,
  Briefcase,
  Code2,
  CreditCard,
  Mail,
  Mic,
  Share2,
  Users,
  Workflow,
} from 'lucide-react'
import { INTEGRATION_TYPE_CARDS, type IntegrationTypeCard } from './integration-type-cards'

const ICONS: Record<IntegrationTypeCard['id'], typeof Mic> = {
  note_taker: Mic,
  social: Share2,
  automation: Workflow,
  ads_analytics: BarChart3,
  email_marketing: Mail,
  payments: CreditCard,
  crm: Users,
  productivity: Briefcase,
  developer: Code2,
}

type Props = {
  onSelect: (card: IntegrationTypeCard) => void
}

/** Row of integration-type cards; only available kinds are clickable. */
export function IntegrationTypeCards({ onSelect }: Props) {
  return (
    <div
      className="gap-spacing-3 grid grid-cols-2 sm:grid-cols-3"
      data-testid="integration-type-cards"
    >
      {INTEGRATION_TYPE_CARDS.map((card) => {
        const Icon = ICONS[card.id]
        return (
          <button
            key={card.id}
            type="button"
            disabled={!card.available}
            onClick={() => onSelect(card)}
            aria-label={card.label}
            className={`surface-card border-border rounded-spacing-3 p-spacing-4 gap-spacing-2 flex flex-col items-start border text-left transition-colors ${
              card.available
                ? 'hover:bg-hover-subtle cursor-pointer'
                : 'cursor-not-allowed opacity-50'
            }`}
          >
            <div className="gap-spacing-2 flex w-full items-center justify-between">
              <Icon className="icon-sm text-muted-foreground" />
              {card.available ? null : (
                <span className="badge-glass badge-glass-sm badge-glass-muted">Coming soon</span>
              )}
            </div>
            <span className="body-2 text-foreground font-medium">{card.label}</span>
            <span className="body-4 text-muted-foreground">{card.description}</span>
          </button>
        )
      })}
    </div>
  )
}
