'use client'

import type { WaitlistEntryRow } from '../types/waitlist.types'

export function WaitlistTable({
  entries,
  sendingId,
  onSendInvite,
}: {
  entries: WaitlistEntryRow[]
  sendingId: string | null
  onSendInvite: (id: string) => void
}) {
  return (
    <div className="surface-card rounded-spacing-3 overflow-x-auto border border-[var(--border)]">
      <table className="body-2 text-foreground w-full min-w-[720px] text-left">
        <thead>
          <tr className="text-muted-foreground border-b border-[var(--border)]">
            <th className="px-spacing-4 py-spacing-3 font-medium">Email</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Name</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Source</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Use case</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Status</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Joined</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Invited</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Redeemed</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="px-spacing-4 py-spacing-6 text-muted-foreground text-center"
              >
                No waitlist entries yet.
              </td>
            </tr>
          ) : (
            entries.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-spacing-4 py-spacing-3">{row.email}</td>
                <td className="px-spacing-4 py-spacing-3">{row.name ?? '—'}</td>
                <td className="px-spacing-4 py-spacing-3">{row.heard_from ?? '—'}</td>
                <td className="px-spacing-4 py-spacing-3">{row.use_case ?? '—'}</td>
                <td className="px-spacing-4 py-spacing-3 capitalize">{row.status}</td>
                <td className="px-spacing-4 py-spacing-3 text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-spacing-4 py-spacing-3 text-muted-foreground">
                  {row.invited_at ? new Date(row.invited_at).toLocaleString() : '—'}
                </td>
                <td className="px-spacing-4 py-spacing-3 text-muted-foreground">
                  {row.invite_redeemed_at ? new Date(row.invite_redeemed_at).toLocaleString() : '—'}
                </td>
                <td className="px-spacing-4 py-spacing-3">
                  <button
                    type="button"
                    disabled={row.status !== 'pending' || sendingId === row.id}
                    onClick={() => onSendInvite(row.id)}
                    className="button-glass-purple rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sendingId === row.id ? 'Sending…' : 'Send invite'}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
