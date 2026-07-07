'use client'

import { useMemo, useState } from 'react'
import type { ChannelMember } from '../services/channels.service'

function getMemberLabel(member: ChannelMember): string {
  if (member.member_type === 'agent') return member.agent_key || 'Agent'
  return member.profile?.full_name || member.user_id || 'User'
}

export function ChannelMembersPanel({
  open,
  members,
  onClose,
  onAddUser,
  onAddAgent,
  onChangeRole,
  onRemoveMember,
}: {
  open: boolean
  members: ChannelMember[]
  onClose: () => void
  onAddUser: (userId: string) => Promise<void> | void
  onAddAgent: (agentKey: string) => Promise<void> | void
  onChangeRole: (memberId: string, role: 'admin' | 'edit' | 'view') => Promise<void> | void
  onRemoveMember: (memberId: string) => Promise<void> | void
}) {
  const [userIdInput, setUserIdInput] = useState('')
  const [agentKeyInput, setAgentKeyInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        getMemberLabel(a).toLocaleLowerCase().localeCompare(getMemberLabel(b).toLocaleLowerCase()),
      ),
    [members],
  )

  if (!open) return null

  return (
    <aside className="border-border bg-card flex h-full w-[320px] shrink-0 flex-col border-l">
      <header className="border-border p-spacing-3 flex items-center justify-between border-b">
        <h2 className="title-h6 text-foreground">Members</h2>
        <button
          type="button"
          onClick={onClose}
          className="body-3 text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </header>

      <div className="border-border space-y-spacing-2 p-spacing-3 border-b">
        <div className="space-y-1">
          <label className="typo-caption text-muted-foreground block">Add user by user ID</label>
          <div className="gap-spacing-2 flex">
            <input
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="user uuid"
              className="bg-background border-border body-3 text-foreground rounded-spacing-2 px-spacing-2 h-9 w-full border"
            />
            <button
              type="button"
              disabled={!userIdInput.trim() || submitting}
              onClick={async () => {
                const userId = userIdInput.trim()
                if (!userId) return
                setSubmitting(true)
                try {
                  await onAddUser(userId)
                  setUserIdInput('')
                } finally {
                  setSubmitting(false)
                }
              }}
              className="bg-primary text-primary-foreground body-3 rounded-spacing-2 px-spacing-2 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="typo-caption text-muted-foreground block">Add agent by key</label>
          <div className="gap-spacing-2 flex">
            <input
              value={agentKeyInput}
              onChange={(event) => setAgentKeyInput(event.target.value)}
              placeholder="agent key"
              className="bg-background border-border body-3 text-foreground rounded-spacing-2 px-spacing-2 h-9 w-full border"
            />
            <button
              type="button"
              disabled={!agentKeyInput.trim() || submitting}
              onClick={async () => {
                const agentKey = agentKeyInput.trim()
                if (!agentKey) return
                setSubmitting(true)
                try {
                  await onAddAgent(agentKey)
                  setAgentKeyInput('')
                } finally {
                  setSubmitting(false)
                }
              }}
              className="bg-primary text-primary-foreground body-3 rounded-spacing-2 px-spacing-2 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <ul className="space-y-spacing-2 p-spacing-3 min-h-0 flex-1 overflow-y-auto">
        {sortedMembers.map((member) => (
          <li key={member.id} className="border-border rounded-spacing-2 p-spacing-2 border">
            <div className="gap-spacing-2 flex items-start justify-between">
              <div className="min-w-0">
                <p className="body-3 text-foreground truncate">{getMemberLabel(member)}</p>
                <p className="typo-caption text-muted-foreground">
                  {member.member_type === 'agent' ? 'Agent' : 'User'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void onRemoveMember(member.id)}
                className="typo-caption text-danger"
              >
                Remove
              </button>
            </div>

            <div className="mt-spacing-2">
              <select
                value={member.role}
                onChange={(event) =>
                  void onChangeRole(member.id, event.target.value as 'admin' | 'edit' | 'view')
                }
                className="bg-background border-border body-3 text-foreground rounded-spacing-2 px-spacing-2 h-8 w-full border"
              >
                <option value="admin">Admin</option>
                <option value="edit">Edit</option>
                <option value="view">View only</option>
              </select>
            </div>
          </li>
        ))}

        {sortedMembers.length === 0 && (
          <li className="body-3 text-muted-foreground">No members yet.</li>
        )}
      </ul>
    </aside>
  )
}
