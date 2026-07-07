'use client'

import { cn } from '@/lib/utils/cn'
import {
  recurringTrainingCadenceLabel,
  recurringTrainingKindLabel,
  type RecurringTrainingRule,
} from '../../../services/recurring-rules.service'
import {
  CompanyDreamEnableSwitch,
  CompanyDreamRuleCard,
  CompanyDreamTitleInfo,
} from './rule-cards/CompanyDreamRuleCard'
import { FathomRuleCard } from './rule-cards/FathomRuleCard'
import { FirefliesRuleCard } from './rule-cards/FirefliesRuleCard'
import { SlackRuleCard } from './rule-cards/SlackRuleCard'
import { ZoomRuleCard } from './rule-cards/ZoomRuleCard'

function destinationBadgeClass(kind: RecurringTrainingRule['destinationKind']): string {
  switch (kind) {
    case 'campaign':
      return 'badge-glass-purple'
    case 'agent':
      return 'badge-glass-orange'
    case 'customer':
      return 'badge-glass-blue'
    case 'workspace':
      return 'badge-glass-muted'
    case 'user':
      return 'badge-glass-green'
  }
}

export function RecurringRuleRow({
  rule,
  onRefresh,
}: {
  rule: RecurringTrainingRule
  onRefresh: () => Promise<void>
}) {
  const isCompanyDream = rule.kind === 'company_dream'

  return (
    <div
      className={cn(
        !isCompanyDream && 'border-border rounded-spacing-3 surface-card overflow-hidden border',
      )}
    >
      <div
        className={cn(
          'gap-spacing-3 flex items-center',
          isCompanyDream ? 'px-spacing-3 pt-spacing-3 pb-0' : 'p-spacing-3',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="gap-spacing-2 flex flex-wrap items-center">
            <p className="body-2 text-foreground min-w-0 truncate font-semibold">{rule.name}</p>
            {isCompanyDream ? <CompanyDreamTitleInfo /> : null}
            {!isCompanyDream ? (
              <>
                <span
                  className={cn(
                    'badge-glass badge-glass-sm shrink-0',
                    rule.enabled ? 'badge-glass-green' : 'badge-glass-muted',
                  )}
                >
                  {rule.enabled ? 'On' : 'Off'}
                </span>
                <span
                  className={cn(
                    'badge-glass badge-glass-sm shrink-0',
                    destinationBadgeClass(rule.destinationKind),
                  )}
                >
                  {rule.destinationLabel}
                </span>
              </>
            ) : null}
          </div>
          {!isCompanyDream ? (
            <p className="typo-caption text-muted-foreground mt-spacing-1">
              {recurringTrainingKindLabel(rule.kind)} ·{' '}
              {recurringTrainingCadenceLabel(rule.cadence)}
              {rule.lastRunAt ? ` · Last run ${new Date(rule.lastRunAt).toLocaleDateString()}` : ''}
            </p>
          ) : null}
        </div>
        {isCompanyDream ? <CompanyDreamEnableSwitch rule={rule} onRefresh={onRefresh} /> : null}
      </div>

      {rule.kind === 'slack' ? <SlackRuleCard rule={rule} onRefresh={onRefresh} /> : null}
      {rule.kind === 'fathom_auto' ? <FathomRuleCard rule={rule} onRefresh={onRefresh} /> : null}
      {rule.kind === 'fireflies_sync' ? <FirefliesRuleCard rule={rule} /> : null}
      {rule.kind === 'zoom_auto' ? <ZoomRuleCard rule={rule} /> : null}
      {rule.kind === 'company_dream' ? (
        <CompanyDreamRuleCard rule={rule} onRefresh={onRefresh} />
      ) : null}
    </div>
  )
}
