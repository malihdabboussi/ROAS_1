'use client'

import { Check, TrendingUp, Zap } from 'lucide-react'
import { VibeyAgentsIcon } from '@/features/projects/components/VibeyAgentsIcon'

export interface AgentIntegrationConfirmCardProps {
  status?: 'pending' | 'approved' | 'cancelled'
  onConfirm?: () => void
  onCancel?: () => void
}

export function AgentIntegrationConfirmCard({
  status = 'pending',
  onConfirm,
  onCancel,
}: AgentIntegrationConfirmCardProps) {
  const isApproved = status === 'approved'
  const isPending = status === 'pending'

  if (isApproved) {
    return (
      <div className="surface-card mt-spacing-3 rounded-spacing-2 p-spacing-3 border border-emerald-500/30 bg-emerald-500/10">
        <div className="gap-spacing-2 flex items-start">
          <Check className="icon-sm mt-0.5 flex-shrink-0 text-emerald-500" />
          <div className="flex flex-1 flex-col">
            <span className="body-2 text-foreground font-medium uppercase tracking-tight">
              Vibey Agents Enabled
            </span>
            <p className="body-3 text-muted-foreground mt-0.5">
              Viktor is now integrating the SDK and setting up your agent proxy routes.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-spacing-3">
      <div
        className="surface-card border-border overflow-hidden rounded-[24px] border shadow-2xl transition-all"
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.03) 50%, rgba(16, 185, 129, 0.02) 100%)',
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3">
            <VibeyAgentsIcon size="sm" />
            <div className="flex flex-col">
              <h3
                className="text-foreground text-sm font-bold uppercase tracking-tight"
                style={{ fontFamily: 'var(--font-site-headline)' }}
              >
                Enable Vibey Agents
              </h3>
              <p className="body-4 text-muted-foreground">
                Complete setup to connect your AI team.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <FeatureItem
              icon={<Zap className="h-3.5 w-3.5 text-emerald-400" />}
              title="Built-in API Proxy"
              description="Securely route requests to your agents without exposing keys."
            />
            <FeatureItem
              icon={<Check className="h-3.5 w-3.5 text-cyan-400" />}
              title="Seamless Auth"
              description="Automatic session management for your app's end-users."
            />
            <FeatureItem
              icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
              title="Shared Credits"
              description="Uses your main account balance for all agent operations."
            />
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button
              onClick={onCancel}
              disabled={!isPending}
              className="body-3 text-muted-foreground hover:text-foreground px-4 py-2 font-medium transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={onConfirm}
              disabled={!isPending}
              className="shadow-[0_10px_30px_-5px_rgba(16, 185, 129, 0.3)] group relative overflow-hidden rounded-xl px-6 py-2 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background:
                  'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 182, 212, 0.35) 100%)',
                color: 'rgb(167, 243, 208)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_3s_infinite]" />
              <span className="relative z-10 uppercase tracking-wider">Allow</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border bg-white/5">
        {icon}
      </div>
      <div>
        <p className="body-3 text-foreground font-semibold leading-none">{title}</p>
        <p className="body-4 text-muted-foreground mt-1 leading-tight">{description}</p>
      </div>
    </div>
  )
}
