'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  deleteAuthUser as apiDeleteAuthUser,
  createAuthUser,
  listAuthUsers,
} from '../../services/supabase-integration.service'
import type { AuthUser } from '../../types'

interface DatabaseAuthPanelProps {
  projectRef: string
}

const PAGE_SIZE = 50

export function DatabaseAuthPanel({ projectRef }: DatabaseAuthPanelProps) {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listAuthUsers(projectRef, page, PAGE_SIZE)
      setUsers(result.users)
      setTotal(result.total)
    } catch {
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [projectRef, page])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleCreateUser = async () => {
    if (!newEmail.trim() || !newPassword.trim()) return
    setCreating(true)
    try {
      await createAuthUser(projectRef, {
        email: newEmail.trim(),
        password: newPassword.trim(),
        email_confirm: true,
      })
      setShowAddForm(false)
      setNewEmail('')
      setNewPassword('')
      await loadUsers()
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiDeleteAuthUser(projectRef, userId)
      await loadUsers()
    } catch {
      // silent
    }
  }

  const hasPrev = page > 1
  const hasNext = page * PAGE_SIZE < total

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-spacing-3 py-spacing-2 border-border flex items-center justify-between border-b">
        <div className="gap-spacing-2 flex items-center">
          <Users className="icon-sm text-muted-foreground" />
          <span className="body-2 font-semibold">Auth Users</span>
          <span className="badge-glass badge-glass-muted typo-caption font-medium">{total}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(true)
            setNewEmail('')
            setNewPassword('')
          }}
          className="button-glass-accent gap-spacing-1 flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold"
        >
          <UserPlus className="h-3 w-3" />
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="border-border bg-muted/30 sticky top-0 border-b">
              <tr>
                <th className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground font-medium">
                  Email
                </th>
                <th className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground font-medium">
                  Provider
                </th>
                <th className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground font-medium">
                  Created
                </th>
                <th className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground font-medium">
                  Last Sign In
                </th>
                <th className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground font-medium">
                  Status
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {/* Add user form */}
              {showAddForm && (
                <tr className="border-border bg-primary/5 border-b">
                  <td className="px-spacing-2 py-spacing-1" colSpan={2}>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="body-4 border-border placeholder:text-muted-foreground/50 focus:ring-primary h-6 w-full min-w-[120px] rounded border bg-transparent px-1 focus:outline-none focus:ring-1"
                      autoFocus
                    />
                  </td>
                  <td className="px-spacing-2 py-spacing-1" colSpan={2}>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password (min 6 chars)"
                      className="body-4 border-border placeholder:text-muted-foreground/50 focus:ring-primary h-6 w-full min-w-[120px] rounded border bg-transparent px-1 focus:outline-none focus:ring-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateUser()
                        if (e.key === 'Escape') setShowAddForm(false)
                      }}
                    />
                  </td>
                  <td />
                  <td className="px-spacing-1 py-spacing-1">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={handleCreateUser}
                        disabled={creating}
                        className="flex h-5 w-5 items-center justify-center rounded text-emerald-500 hover:bg-emerald-500/10"
                        title="Create user"
                      >
                        {creating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="text-muted-foreground hover:bg-hover-subtle flex h-5 w-5 items-center justify-center rounded"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* User rows */}
              {users.map((u) => {
                const providers = u.identities?.map((i) => i.provider).join(', ') || 'email'
                const isConfirmed = !!u.email_confirmed_at
                const isBanned = !!u.banned_until

                return (
                  <tr
                    key={u.id}
                    className="border-border hover:bg-hover-subtle/50 group border-b transition-colors"
                  >
                    <td className="px-spacing-2 py-spacing-1 body-4 max-w-[200px] truncate">
                      {u.email || u.phone || u.id.slice(0, 8)}
                    </td>
                    <td className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground">
                      {providers}
                    </td>
                    <td className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-spacing-2 py-spacing-1 body-4 text-muted-foreground whitespace-nowrap">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-spacing-2 py-spacing-1">
                      {isBanned ? (
                        <span className="badge-glass badge-glass-red typo-caption font-medium">
                          Banned
                        </span>
                      ) : isConfirmed ? (
                        <span className="badge-glass badge-glass-green typo-caption font-medium">
                          Confirmed
                        </span>
                      ) : (
                        <span className="badge-glass badge-glass-orange typo-caption font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-spacing-1 py-spacing-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-destructive hover:bg-destructive/10 flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                        title="Delete user"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="body-4 text-muted-foreground py-spacing-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-6 w-6 opacity-30" />
                      <span>No auth users yet</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="px-spacing-3 py-spacing-2 border-border flex items-center justify-between border-t">
          <span className="typo-caption text-muted-foreground">
            Page {page} ({total} total)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-icon-glass !h-6 !w-6 disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="btn-icon-glass !h-6 !w-6 disabled:opacity-30"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
