'use client'

import { useEffect, useMemo, useState } from 'react'
import { Info, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import Switch from '@/components/ui/forms/switch'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { useOrgStore, type OrgRole } from '@/lib/org'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  setFathomAutoIngest,
  type RecurringTrainingRule,
} from '../../../../services/recurring-rules.service'

const ORG_BILLING_ROLES: OrgRole[] = ['owner', 'admin', 'creator', 'editor']

export function FathomRuleCard({
  rule,
  onRefresh,
}: {
  rule: Extract<RecurringTrainingRule, { kind: 'fathom_auto' }>
  onRefresh: (options?: { silent?: boolean }) => Promise<void>
}) {
  const [savingToggle, setSavingToggle] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [billingScope, setBillingScope] = useState(rule.billingScope)
  const [billingOrgId, setBillingOrgId] = useState(rule.billingOrgId)

  useEffect(() => {
    setBillingScope(rule.billingScope)
    setBillingOrgId(rule.billingOrgId)
  }, [rule.billingOrgId, rule.billingScope])

  const memberships = useOrgStore((state) => state.memberships)
  const billingOrgs = memberships.filter(
    (membership) => membership.status === 'active' && ORG_BILLING_ROLES.includes(membership.role),
  )
  const selectedOrg = billingOrgs.find((membership) => membership.org_id === billingOrgId)
  const selectedBillingValue =
    billingScope === 'org' && billingOrgId ? `org:${billingOrgId}` : 'personal'
  const billingLabel =
    billingScope === 'org' && selectedOrg
      ? selectedOrg.organizations.name
      : billingScope === 'org'
        ? 'Selected organization'
        : 'Personal account'

  const billingOptions = useMemo(() => {
    const options: AutomationSolidOption[] = [
      {
        value: 'personal',
        label: 'Personal account',
        leading: <User className="icon-xs shrink-0" />,
      },
    ]

    if (billingScope === 'org' && billingOrgId && !selectedOrg) {
      options.push({
        value: `org:${billingOrgId}`,
        label: 'Selected organization unavailable',
        leading: <Users className="icon-xs shrink-0" />,
      })
    }

    for (const membership of billingOrgs) {
      options.push({
        value: `org:${membership.org_id}`,
        label: membership.organizations.name,
        leading: <Users className="icon-xs shrink-0" />,
      })
    }

    return options
  }, [billingOrgs, billingOrgId, billingScope, selectedOrg])

  const toggle = async () => {
    setSavingToggle(true)
    try {
      await setFathomAutoIngest(!rule.autoIngest, {
        billingScope,
        billingOrgId,
      })
      await onRefresh()
      toast.success(!rule.autoIngest ? 'Fathom training is on.' : 'Fathom training is paused.')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not update Fathom training.'))
    } finally {
      setSavingToggle(false)
    }
  }

  const changeBilling = async (value: string) => {
    const nextBilling =
      value === 'personal'
        ? { billingScope: 'personal' as const, billingOrgId: null }
        : { billingScope: 'org' as const, billingOrgId: value.replace(/^org:/, '') }
    const previous = { billingScope, billingOrgId }
    setBillingScope(nextBilling.billingScope)
    setBillingOrgId(nextBilling.billingOrgId)
    setSavingBilling(true)
    try {
      await setFathomAutoIngest(rule.autoIngest, nextBilling)
      toast.success('Fathom billing account updated.')
    } catch (err) {
      setBillingScope(previous.billingScope)
      setBillingOrgId(previous.billingOrgId)
      toast.error(sanitizeUserError(err, 'Could not update Fathom billing account.'))
    } finally {
      setSavingBilling(false)
    }
  }

  return (
    <div className="border-border p-spacing-3 space-y-spacing-3 border-t">
      <div className="flex items-center justify-between">
        <div className="gap-spacing-2 flex items-center">
          <span className="body-3 text-foreground">Auto-crystallize meetings</span>
          <button
            type="button"
            onClick={() => setShowInfo((value) => !value)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Explain Fathom auto-crystallize"
          >
            <Info className="icon-xs" />
          </button>
        </div>
        <Switch
          checked={rule.autoIngest}
          disabled={!rule.connected || savingToggle}
          onCheckedChange={toggle}
        />
      </div>
      <div className="space-y-spacing-2">
        <div>
          <p className="body-3 text-foreground font-medium">Billing account</p>
          <p className="body-4 text-muted-foreground">Webhook imports charge {billingLabel}.</p>
        </div>
        <AutomationSolidSelect
          value={selectedBillingValue}
          options={billingOptions}
          onChange={changeBilling}
          placeholder="Select billing account"
          disabled={!rule.connected || savingBilling}
          ariaLabel="Billing account"
        />
      </div>
      {showInfo ? (
        <div className="surface-bg rounded-spacing-2 p-spacing-3">
          <p className="body-3 text-muted-foreground">
            When enabled, Fathom sends a webhook after each call. The transcript runs through the
            crystallization pipeline and significant items become memories in your brain.
          </p>
        </div>
      ) : null}
      {!rule.connected ? (
        <p className="body-4 text-muted-foreground">
          Connect Fathom in Integrations to use this rule.
        </p>
      ) : null}
    </div>
  )
}
