'use client'

import { useState } from 'react'
import type { EnterpriseApplicationRow } from '../types/enterprise-applications.types'

const STATUS_OPTIONS = ['pending', 'contacted', 'approved', 'declined'] as const

export function EnterpriseApplicationsTable({
  entries,
  updatingId,
  onUpdateStatus,
  onUpdateNotes,
}: {
  entries: EnterpriseApplicationRow[]
  updatingId: string | null
  onUpdateStatus: (id: string, status: string) => void
  onUpdateNotes: (id: string, notes: string) => void
}) {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')

  return (
    <div className="surface-card rounded-spacing-3 overflow-x-auto border border-[var(--border)]">
      <table className="body-2 text-foreground w-full min-w-[1100px] text-left">
        <thead>
          <tr className="text-muted-foreground border-b border-[var(--border)]">
            <th className="px-spacing-4 py-spacing-3 font-medium">Email</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Name</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Company</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Size</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Role</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Use Case</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Team</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Source</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Status</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Applied</th>
            <th className="px-spacing-4 py-spacing-3 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td
                colSpan={11}
                className="px-spacing-4 py-spacing-6 text-muted-foreground text-center"
              >
                No enterprise applications yet.
              </td>
            </tr>
          ) : (
            entries.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-spacing-4 py-spacing-3 max-w-[180px] truncate">{row.email}</td>
                <td className="px-spacing-4 py-spacing-3">{row.name ?? '—'}</td>
                <td className="px-spacing-4 py-spacing-3">{row.company_name}</td>
                <td className="px-spacing-4 py-spacing-3">{row.company_size}</td>
                <td className="px-spacing-4 py-spacing-3">{row.role_title ?? '—'}</td>
                <td className="px-spacing-4 py-spacing-3 max-w-[200px] truncate">
                  {row.use_case ?? '—'}
                </td>
                <td className="px-spacing-4 py-spacing-3">{row.team_size ?? '—'}</td>
                <td className="px-spacing-4 py-spacing-3 capitalize">{row.source}</td>
                <td className="px-spacing-4 py-spacing-3">
                  <select
                    value={row.status}
                    disabled={updatingId === row.id}
                    onChange={(e) => onUpdateStatus(row.id, e.target.value)}
                    className="input-glass body-3 rounded-spacing-2 px-2 py-1"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-spacing-4 py-spacing-3 text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-spacing-4 py-spacing-3">
                  {editingNotesId === row.id ? (
                    <input
                      autoFocus
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      onBlur={() => {
                        onUpdateNotes(row.id, notesValue)
                        setEditingNotesId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUpdateNotes(row.id, notesValue)
                          setEditingNotesId(null)
                        }
                        if (e.key === 'Escape') setEditingNotesId(null)
                      }}
                      className="input-glass body-3 rounded-spacing-2 w-32 px-2 py-1"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNotesValue(row.notes ?? '')
                        setEditingNotesId(row.id)
                      }}
                      className="body-3 text-muted-foreground hover:text-foreground max-w-[120px] truncate transition-colors"
                      title={row.notes ?? 'Click to add notes'}
                    >
                      {row.notes || '—'}
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
