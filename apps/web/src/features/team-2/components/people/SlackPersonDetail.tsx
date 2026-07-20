'use client'

import Link from 'next/link'
import {
  Brain,
  CircleUserRound,
  ExternalLink,
  MessagesSquare,
  UserRoundCheck,
  X,
} from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type {
  SlackDiscoveredPerson,
  SlackPersonActivity,
} from '../../services/slack-people.service'

interface SlackPersonDetailProps {
  person: SlackDiscoveredPerson
  activity: SlackPersonActivity | null
  loading: boolean
  onClose: () => void
  onConfirmIdentity: () => void
}

export function SlackPersonDetail({
  person,
  activity,
  loading,
  onClose,
  onConfirmIdentity,
}: SlackPersonDetailProps) {
  return (
    <section className="surface-card border-border rounded-spacing-4 border">
      <div className="border-border p-spacing-4 gap-spacing-4 flex items-start justify-between border-b">
        <div className="min-w-0">
          <div className="gap-spacing-2 flex items-center">
            <h2 className="title-h6 text-foreground truncate">{person.display_name}</h2>
            {person.vibey_user_id ? (
              <span className="badge-glass badge-glass-green body-4 gap-spacing-1 inline-flex items-center">
                <UserRoundCheck className="icon-xs" /> Portal user
              </span>
            ) : (
              <span className="badge-glass badge-glass-muted body-4 gap-spacing-1 inline-flex items-center">
                <CircleUserRound className="icon-xs" /> Slack-only
              </span>
            )}
          </div>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            {person.relationship_kind === 'internal'
              ? 'Internal person'
              : person.relationship_kind === 'external'
                ? 'External person'
                : 'Ignored person'}
            {person.email ? ` · ${person.email}` : ''}
          </p>
        </div>
        <button type="button" className="btn-icon-bare" aria-label="Close person" onClick={onClose}>
          <X className="icon-xs" />
        </button>
      </div>

      <div className="p-spacing-4 gap-spacing-4 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="gap-spacing-4 flex flex-col">
          <div className="bg-secondary p-spacing-4 rounded-spacing-3">
            <div className="gap-spacing-2 flex items-center">
              <Brain className="icon-sm text-primary" />
              <h3 className="body-2 text-foreground font-semibold">Brain</h3>
            </div>
            {person.brain_id ? (
              <>
                <p className="body-3 text-foreground mt-spacing-2">
                  {person.brain_name || 'User Brain'}
                </p>
                <p className="body-4 text-muted-foreground mt-spacing-1">
                  This Slack identity is attached to an accessible portal User Brain.
                </p>
                <Link
                  href="/brain"
                  className="button-compact button-glass-purple mt-spacing-3 inline-flex"
                >
                  Open Brain <ExternalLink className="icon-xs" />
                </Link>
              </>
            ) : (
              <p className="body-4 text-muted-foreground mt-spacing-2">
                {person.vibey_user_id
                  ? 'A portal account is linked, but its User Brain is not shared with this admin.'
                  : 'No portal User Brain is attached. This remains an organization-managed person record.'}
              </p>
            )}
          </div>

          {person.suggested_vibey_user_id ? (
            <div className="border-warning surface-card p-spacing-4 rounded-spacing-3 border">
              <p className="body-3 text-foreground font-medium">Possible portal match</p>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                The Slack name exactly matches one active portal member. Confirm before attaching
                their User Brain.
              </p>
              <button
                type="button"
                onClick={onConfirmIdentity}
                className="button-compact button-glass-primary mt-spacing-3"
              >
                Confirm match
              </button>
            </div>
          ) : null}

          <div className="bg-secondary p-spacing-4 rounded-spacing-3">
            <p className="body-3 text-foreground font-medium">Agent mode: {person.delivery_mode}</p>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              {person.delivery_mode === 'off'
                ? 'No proposals or sends are allowed.'
                : person.delivery_mode === 'shadow'
                  ? 'Drafts stay inside this platform for review. Nothing sends automatically.'
                  : 'Approved drafts can be sent to this Slack DM. Automatic outreach is not enabled yet.'}
            </p>
          </div>
        </div>

        <div className="border-border rounded-spacing-3 overflow-hidden border">
          <div className="border-border p-spacing-4 border-b">
            <div className="gap-spacing-2 flex items-center">
              <MessagesSquare className="icon-sm text-primary" />
              <h3 className="body-2 text-foreground font-semibold">
                Slack conversation & Shadow log
              </h3>
            </div>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              Draft proposals stay here. Sent items land in this direct Slack conversation.
            </p>
          </div>

          {loading ? (
            <div className="p-spacing-8 flex justify-center">
              <VibeyLoadingOrb size="sm" text="Opening this Slack conversation..." />
            </div>
          ) : (
            <div className="p-spacing-4 gap-spacing-3 flex flex-col">
              {(activity?.actions.length ?? 0) === 0 && (activity?.messages.length ?? 0) === 0 ? (
                <p className="body-3 text-muted-foreground">
                  No Slack messages or Shadow drafts yet.
                </p>
              ) : null}
              {activity?.actions.map((action) => (
                <article key={action.id} className="bg-secondary p-spacing-3 rounded-spacing-3">
                  <div className="gap-spacing-2 flex items-center justify-between">
                    <span className="body-4 text-muted-foreground">Shadow proposal</span>
                    <span className="badge-glass badge-glass-muted body-4 capitalize">
                      {action.status}
                    </span>
                  </div>
                  <p className="body-3 text-foreground mt-spacing-2 whitespace-pre-wrap">
                    {action.proposed_content}
                  </p>
                  {action.rationale ? (
                    <p className="body-4 text-muted-foreground mt-spacing-2">
                      Why: {action.rationale}
                    </p>
                  ) : null}
                </article>
              ))}
              {activity?.messages.map((message) => (
                <article
                  key={`${message.ts}-${message.direction}`}
                  className={
                    message.direction === 'outbound'
                      ? 'surface-card border-primary p-spacing-3 ml-spacing-8 rounded-spacing-3 border'
                      : 'bg-secondary p-spacing-3 mr-spacing-8 rounded-spacing-3'
                  }
                >
                  <p className="body-4 text-muted-foreground">
                    {message.direction === 'outbound'
                      ? 'Sent by your Slack agent'
                      : person.display_name}
                  </p>
                  <p className="body-3 text-foreground mt-spacing-1 whitespace-pre-wrap">
                    {message.text}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
