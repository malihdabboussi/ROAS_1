'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { backendGet } from '@/lib/api/backend-client'
import { HumanDMChat } from '../components/HumanDMChat'
import { HumanProfilePanel } from '../components/HumanProfilePanel'
import { useDmList } from '../hooks/use-dm-list'
import { useDmUnread } from '../hooks/use-dm-unread'
import { peopleCache } from '../hooks/use-org-people'
import { dmService, type DmConversation } from '../services/dm.service'

interface HumanDMContainerProps {
  targetUserId: string
  onBack: () => void
}

interface CurrentUser {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export function HumanDMContainer({ targetUserId, onBack }: HumanDMContainerProps) {
  const { dms, reload } = useDmList()
  const { markRead: markDmUnread } = useDmUnread()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    let cancelled = false
    void backendGet<CurrentUser>('/api/profile').then((profile) => {
      if (cancelled) return
      setCurrentUser({
        id: profile.id,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setOpening(true)
    setError(null)
    void dmService
      .openDm(targetUserId)
      .then((res) => {
        if (cancelled) return
        setConversationId(res.conversation_id)
        if (res.created) {
          void reload()
          void peopleCache.reload()
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not open DM')
      })
      .finally(() => {
        if (!cancelled) setOpening(false)
      })
    return () => {
      cancelled = true
    }
  }, [targetUserId, reload])

  useEffect(() => {
    if (!conversationId) return
    void markDmUnread(conversationId)
  }, [conversationId, markDmUnread])

  const conversation: DmConversation | null = useMemo(
    () => dms.find((d) => d.partner.id === targetUserId) ?? null,
    [dms, targetUserId],
  )

  if (opening) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Opening DM…" state="processing" size="lg" />
      </div>
    )
  }

  if (error || !conversationId || !conversation) {
    return (
      <div className="gap-spacing-3 flex h-full flex-col items-center justify-center">
        <p className="body-2 text-foreground">{error ?? 'DM unavailable.'}</p>
        <button type="button" onClick={onBack} className="body-3 text-muted-foreground underline">
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="gap-spacing-3 px-spacing-3 pb-spacing-3 flex min-h-0 flex-1 flex-row overflow-hidden pt-0">
      <div className="pt-spacing-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="gap-spacing-2 px-spacing-3 pb-spacing-2 flex shrink-0 items-center">
          <button
            type="button"
            onClick={onBack}
            className="btn-icon-bare shrink-0"
            aria-label="Back to team"
            title="Back"
          >
            <ArrowLeft className="icon-sm" />
          </button>
          {conversation.partner.avatar_url ? (
            <img
              src={conversation.partner.avatar_url}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <span className="body-3 font-semibold uppercase">
                {(conversation.partner.full_name ?? '?').slice(0, 1)}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <span className="body-2 text-foreground block truncate font-semibold">
              {conversation.partner.full_name ?? 'Direct message'}
            </span>
            {conversation.partner.functional_role && (
              <span className="body-3 text-muted-foreground/80 mt-0.5 block truncate font-normal normal-case">
                {conversation.partner.functional_role}
              </span>
            )}
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <HumanDMChat
            conversationId={conversationId}
            partner={conversation.partner}
            currentUserId={currentUser?.id ?? null}
            currentUserName={currentUser?.full_name ?? null}
            currentUserAvatarUrl={currentUser?.avatar_url ?? null}
          />
        </div>
      </div>
      <div className="pt-spacing-3 hidden w-[min(100%,380px)] shrink-0 md:flex">
        <HumanProfilePanel partner={conversation.partner} orgRole={conversation.org_role} />
      </div>
    </div>
  )
}
