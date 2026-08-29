'use client'

import { useEffect, useState } from 'react'
import { ChatSurfaceRecommendation } from '@/components/global-chat/components/ChatSurfaceRecommendation'
import { HomeDashboardV4Composer } from '@/components/home-dashboard-v4/HomeDashboardV4Composer'
import {
  HomeDashboardV4Greeting,
  HomeDashboardV4Shell,
} from '@/components/home-dashboard-v4/HomeDashboardV4Shell'
import { HomeDashboardVisualProvider } from '@/features/home/context/home-dashboard-visual-context'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { ShellNewChatAgentBar } from './ShellNewChatAgentBar'
import { ShellNewChatTasks } from './ShellNewChatTasks'

function daypartGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function ShellNewChatGreeting({
  compact = false,
  inDrawer = false,
}: {
  compact?: boolean
  inDrawer?: boolean
}) {
  const [firstName, setFirstName] = useState('')
  const [greeting, setGreeting] = useState('Hello')
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const canManageOrgBilling = useOrgStore((s) => s.hasMinRole('admin'))
  const creditBalance = useChatStore((s) => s.creditBalance)

  useEffect(() => {
    setGreeting(daypartGreeting())
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      const meta = user.user_metadata as Record<string, unknown> | undefined
      const fullName =
        (meta?.full_name as string) ?? (meta?.name as string) ?? user.email?.split('@')[0] ?? ''
      const first = (fullName.split(' ')[0] ?? fullName).trim()
      setFirstName(first ? `${first[0]?.toUpperCase()}${first.slice(1)}` : '')
    })
  }, [])

  // Drawer empty-state is greeting + composer only (shell v4). Home owns
  // templates / "For you" — never dump that chrome into the docked chat column.
  const hero = (
    <>
      <div className={cn(compact && '[&_.home-dashboard-v4-greeting]:text-[19px]')}>
        <HomeDashboardV4Greeting greeting={greeting} firstName={firstName} />
      </div>

      {creditBalance !== null && creditBalance.totalAvailable <= 0 ? (
        <div className="mt-4">
          <NewChatCreditDepletedBanner canBuyCredits={!activeOrgId || canManageOrgBilling} />
        </div>
      ) : null}

      <div className={cn('mt-4 flex justify-center', compact && 'shell-composer-narrow')}>
        <HomeDashboardV4Composer />
      </div>

      {!inDrawer && !compact ? <ShellNewChatTasks /> : null}
    </>
  )

  if (inDrawer || compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ShellNewChatAgentBar />
        <ChatSurfaceRecommendation />
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto',
            inDrawer ? 'px-3 py-4' : 'items-center px-4 py-8',
          )}
        >
          <div className={cn('w-full', !inDrawer && 'mx-auto max-w-[740px]')}>{hero}</div>
        </div>
      </div>
    )
  }

  return (
    <HomeDashboardVisualProvider variant="v4">
      <HomeDashboardV4Shell topBar={<ChatSurfaceRecommendation />}>{hero}</HomeDashboardV4Shell>
    </HomeDashboardVisualProvider>
  )
}

function NewChatCreditDepletedBanner({ canBuyCredits }: { canBuyCredits: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--hd4-primary-border)] bg-[var(--hd4-primary-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[15px] font-semibold text-[var(--hd4-text)]">Credits are out</p>
        <p className="mt-1 text-[13px] text-[var(--hd4-text-2)]">
          {canBuyCredits
            ? 'I need credits before I can run agents, brain imports, or automations for this account.'
            : 'I need credits before I can run agents, brain imports, or automations here. Ask an owner or admin to add credits.'}
        </p>
      </div>
      {canBuyCredits ? (
        <button
          type="button"
          className="hd4-rec-cta shrink-0"
          onClick={() => window.dispatchEvent(new CustomEvent('open-credit-purchase'))}
        >
          Add credits
        </button>
      ) : null}
    </div>
  )
}
