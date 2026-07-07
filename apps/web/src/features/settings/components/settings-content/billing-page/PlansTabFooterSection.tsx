'use client'

import { useState } from 'react'
import { Crown, RefreshCw, Zap } from 'lucide-react'
import { CreditPurchaseDialog } from '@/features/billing/components/CreditPurchaseDialog'
import { useUserRole } from '@/hooks/use-user-role'
import { EnterpriseApplicationModal } from '../../EnterpriseApplicationModal'

export function PlansTabFooterSection({
  autoRechargeEnabled,
  currentSlug,
}: {
  autoRechargeEnabled: boolean
  currentSlug: string
}) {
  const { role } = useUserRole()
  const isEnterprise = role === 'enterprise' || currentSlug.startsWith('enterprise')
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)
  const [enterpriseApplied, setEnterpriseApplied] = useState(false)
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [creditDialogMode, setCreditDialogMode] = useState<'buy' | 'auto'>('buy')

  return (
    <>
      <div
        className={`rounded-spacing-3 border-border p-spacing-5 flex items-center justify-between border ${isEnterprise ? 'card-glass-blue' : ''}`}
      >
        <div className="gap-spacing-3 flex items-center">
          <Crown className="text-muted-foreground h-5 w-5" />
          <div>
            <h3 className="body-1 text-foreground font-semibold">Enterprise</h3>
            <p className="body-3 text-muted-foreground">
              Promote your Vibey to become a CEO, and get access to the Multi-Agent organization.
            </p>
          </div>
        </div>
        {isEnterprise ? (
          <span className="button-glass-neutral shrink-0 cursor-default rounded-lg px-4 py-2 text-sm font-medium opacity-70">
            Current Plan
          </span>
        ) : enterpriseApplied ? (
          <span className="badge-glass badge-glass-muted body-3 shrink-0 font-medium">
            Application Submitted
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowEnterpriseModal(true)}
            className="button-glass-purple shrink-0 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Contact Us
          </button>
        )}
      </div>

      <EnterpriseApplicationModal
        open={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
        onSuccess={() => {
          setShowEnterpriseModal(false)
          setEnterpriseApplied(true)
        }}
      />

      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setCreditDialogMode('buy')
            setCreditDialogOpen(true)
          }}
          className="card card-elevated card-glass rounded-spacing-3 p-spacing-4 text-left"
        >
          <div className="gap-spacing-3 flex items-center">
            <div className="rounded-spacing-2 flex h-10 w-10 items-center justify-center border border-blue-500/20 bg-blue-500/10">
              <Zap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="body-2 text-foreground font-medium">Buy Credits</p>
              <p className="body-3 text-muted-foreground">One-time credit top-up</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCreditDialogMode('auto')
            setCreditDialogOpen(true)
          }}
          className={`card card-elevated card-glass rounded-spacing-3 p-spacing-4 relative text-left ${autoRechargeEnabled ? 'ring-primary/40 ring-1' : ''}`}
        >
          <div className="right-spacing-3 top-spacing-3 absolute">
            <span className="badge-glass badge-glass-purple typo-caption font-medium">
              Recommended
            </span>
          </div>
          <div className="gap-spacing-3 flex items-center">
            <div
              className={`rounded-spacing-2 flex h-10 w-10 items-center justify-center ${autoRechargeEnabled ? 'border border-green-500/20 bg-green-500/10' : 'border border-purple-500/20 bg-purple-500/10'}`}
            >
              <RefreshCw
                className={`h-5 w-5 ${autoRechargeEnabled ? 'text-green-500' : 'text-purple-500'}`}
              />
            </div>
            <div>
              <p className="body-2 text-foreground font-medium">Auto Recharge</p>
              <p className="body-3 text-muted-foreground">
                {autoRechargeEnabled
                  ? 'Enabled — click to configure'
                  : 'Auto-buy when credits run low'}
              </p>
            </div>
          </div>
        </button>
      </div>

      <CreditPurchaseDialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        initialMode={creditDialogMode}
      />
    </>
  )
}
