'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ban, Check, Copy, Link2, Plus, Trash2 } from 'lucide-react'
import { createInviteCode, deleteInviteCode, fetchInviteCodes, revokeInviteCode } from '../services/waitlist.service'
import type { CreateInviteCodeResponse, InviteCodeRow } from '../types/waitlist.types'

export function InviteCodesTab() {
  const [codes, setCodes] = useState<InviteCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newResult, setNewResult] = useState<CreateInviteCodeResponse | null>(null)

  const [label, setLabel] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchInviteCodes()
      setCodes(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    setNewResult(null)
    try {
      const result = await createInviteCode({
        label: label.trim() || undefined,
        maxUses: 1,
        expiresInDays: 7,
      })
      setNewResult(result)
      setLabel('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeInviteCode(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteInviteCode(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const copyUrl = (code: string, id: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.roas.io'
    const url = `${appUrl}/join?code=${encodeURIComponent(code)}`
    void navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-spacing-6">
      {/* Create form */}
      <div className="surface-card rounded-spacing-3 p-spacing-6 border border-[var(--border)]">
        <h2 className="body-1 text-foreground font-medium">CREATE INVITE CODE</h2>
        <p className="body-3 text-muted-foreground mt-spacing-1 mb-spacing-4">
          Generate a shareable link that bypasses the waitlist
        </p>

        <div>
          <label className="body-3 text-muted-foreground mb-spacing-1 block">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Investor demo"
            className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg text-foreground placeholder:text-muted-foreground w-full max-w-sm border"
          />
          <p className="body-4 text-muted-foreground mt-spacing-1">Single use, expires in 7 days</p>
        </div>

        <button
          type="button"
          disabled={creating}
          onClick={() => void handleCreate()}
          className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 mt-spacing-4 font-medium disabled:opacity-50"
        >
          <span className="gap-spacing-2 relative z-10 flex items-center">
            <Plus className="icon-sm" />
            {creating ? 'Creating…' : 'Generate code'}
          </span>
        </button>

        {newResult && (
          <div className="mt-spacing-4 rounded-spacing-2 p-spacing-4 border border-green-500/20 bg-green-500/10">
            <p className="body-2 text-foreground font-medium">Invite link created</p>
            <div className="mt-spacing-2 gap-spacing-2 flex items-center">
              <code className="body-3 text-muted-foreground flex-1 break-all">
                {newResult.inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(newResult.inviteUrl)
                  setCopiedId('new')
                  setTimeout(() => setCopiedId(null), 2000)
                }}
                className="btn-icon-glass flex-shrink-0"
              >
                {copiedId === 'new' ? (
                  <Check className="icon-sm text-green-500" />
                ) : (
                  <Copy className="icon-sm" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="body-2 text-destructive">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-spacing-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Codes table */}
      <div className="surface-card rounded-spacing-3 overflow-x-auto border border-[var(--border)]">
        <table className="body-2 text-foreground w-full min-w-[640px] text-left">
          <thead>
            <tr className="text-muted-foreground border-b border-[var(--border)]">
              <th className="px-spacing-4 py-spacing-3 font-medium">Label</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Uses</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Expires</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Active</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Created</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && codes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-spacing-4 py-spacing-6 text-muted-foreground text-center"
                >
                  Loading…
                </td>
              </tr>
            ) : codes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-spacing-4 py-spacing-6 text-muted-foreground text-center"
                >
                  No invite codes yet.
                </td>
              </tr>
            ) : (
              codes.map((row) => {
                const expired = row.expires_at && new Date(row.expires_at) < new Date()
                const maxed = row.max_uses !== null && row.uses_count >= row.max_uses
                return (
                  <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-spacing-4 py-spacing-3">
                      {row.label || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      {row.uses_count}
                      {row.max_uses !== null ? ` / ${row.max_uses}` : ''}
                    </td>
                    <td className="px-spacing-4 py-spacing-3 text-muted-foreground">
                      {row.expires_at ? (
                        <span className={expired ? 'text-destructive' : ''}>
                          {new Date(row.expires_at).toLocaleDateString()}
                        </span>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      {row.is_active && !expired && !maxed ? (
                        <span className="badge-glass badge-glass-green typo-caption font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="badge-glass badge-glass-muted typo-caption font-medium">
                          {expired ? 'Expired' : maxed ? 'Maxed' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-spacing-4 py-spacing-3 text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-spacing-4 py-spacing-3">
                      <div className="gap-spacing-1 flex items-center">
                        <button
                          type="button"
                          onClick={() => copyUrl(row.code, row.id)}
                          className="btn-icon-glass"
                          title="Copy invite link"
                        >
                          {copiedId === row.id ? (
                            <Check className="icon-sm text-green-500" />
                          ) : (
                            <Link2 className="icon-sm" />
                          )}
                        </button>
                        {row.is_active && !expired && !maxed && (
                          <button
                            type="button"
                            onClick={() => void handleRevoke(row.id)}
                            className="btn-icon-glass"
                            title="Revoke (deactivate)"
                          >
                            <Ban className="icon-sm text-amber-500" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id)}
                          className="btn-icon-glass"
                          title="Delete permanently"
                        >
                          <Trash2 className="icon-sm text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
