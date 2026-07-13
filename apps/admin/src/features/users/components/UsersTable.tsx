'use client'

import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { UserRow } from '../types/users.types'

const FLY_APP = 'roas-runtimes'
const FLY_MACHINE_LOGS_URL = (machineId: string) =>
  `https://fly.io/apps/${FLY_APP}/machines/${machineId}`

export type ColumnId =
  | 'email'
  | 'display_name'
  | 'role'
  | 'fly_machine_id'
  | 'total_tokens'
  | 'total_credits'
  | 'credits_remaining'
  | 'total_cost'
  | 'subscription_plan'
  | 'subscription_status'
  | 'subscription_end'
  | 'created_at'

export type ColumnVisibility = Record<ColumnId, boolean>

type UserSort =
  | 'created_at.desc'
  | 'created_at.asc'
  | 'email.asc'
  | 'email.desc'
  | 'display_name.asc'
  | 'display_name.desc'
  | 'role.asc'
  | 'role.desc'
  | 'total_tokens.asc'
  | 'total_tokens.desc'
  | 'total_credits.asc'
  | 'total_credits.desc'
  | 'credits_remaining.asc'
  | 'credits_remaining.desc'
  | 'total_cost.asc'
  | 'total_cost.desc'

interface UsersTableProps {
  loading: boolean
  error: string | null
  rows: UserRow[]
  currentSort: UserSort
  onSortChange: (sort: UserSort) => void
  columnVisibility: ColumnVisibility
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString()
}

function formatDateTime(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString()
}

function formatNumber(n: number | null | undefined) {
  return (n == null ? 0 : n).toLocaleString()
}

function formatCost(n: number) {
  return `$${n.toFixed(2)}`
}

export function UsersTable({
  loading,
  error,
  rows,
  currentSort,
  onSortChange,
  columnVisibility,
}: UsersTableProps) {
  const getDir = (
    key:
      | 'email'
      | 'display_name'
      | 'role'
      | 'created_at'
      | 'total_tokens'
      | 'total_credits'
      | 'credits_remaining'
      | 'total_cost',
  ): 'asc' | 'desc' | null => {
    if (currentSort.startsWith(key)) {
      return currentSort.endsWith('.asc') ? 'asc' : 'desc'
    }
    return null
  }

  const toggleSort = (
    key:
      | 'email'
      | 'display_name'
      | 'role'
      | 'created_at'
      | 'total_tokens'
      | 'total_credits'
      | 'credits_remaining'
      | 'total_cost',
  ) => {
    const dir = getDir(key)
    const next: Record<string, UserSort> = {
      email: dir === 'asc' ? 'email.desc' : 'email.asc',
      display_name: dir === 'asc' ? 'display_name.desc' : 'display_name.asc',
      role: dir === 'asc' ? 'role.desc' : 'role.asc',
      created_at: dir === 'asc' ? 'created_at.desc' : 'created_at.asc',
      total_tokens: dir === 'asc' ? 'total_tokens.desc' : 'total_tokens.asc',
      total_credits: dir === 'asc' ? 'total_credits.desc' : 'total_credits.asc',
      credits_remaining:
        dir === 'asc' ? 'credits_remaining.desc' : 'credits_remaining.asc',
      total_cost: dir === 'asc' ? 'total_cost.desc' : 'total_cost.asc',
    }
    const sort = next[key]
    if (sort) onSortChange(sort)
  }

  if (error) {
    return (
      <div className="py-spacing-8 flex items-center justify-center">
        <div className="text-center">
          <div className="body-2 text-destructive mb-spacing-2">Failed to load users</div>
          <div className="typo-caption text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-spacing-4">
        <div className="gap-spacing-4 px-spacing-3 py-spacing-2 border-border grid grid-cols-[repeat(12,minmax(0,1fr))] border-b">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-muted h-4 w-2/3 rounded" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="gap-spacing-4 px-spacing-3 py-spacing-2 border-border grid grid-cols-[repeat(12,minmax(0,1fr))] border-b"
          >
            {[...Array(12)].map((_, j) => (
              <div key={j} className="bg-muted h-4 w-1/2 animate-pulse rounded" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-border bg-muted/30 border-b">
            {columnVisibility.email && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('email')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Email
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('email') === 'asc' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('email') === 'desc' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            {columnVisibility.display_name && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('display_name')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Name
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('display_name') === 'asc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('display_name') === 'desc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            {columnVisibility.role && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('role')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Role
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('role') === 'asc' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('role') === 'desc' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            {columnVisibility.fly_machine_id && (
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Machine
              </th>
            )}
            {columnVisibility.total_tokens && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('total_tokens')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Tokens
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('total_tokens') === 'asc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('total_tokens') === 'desc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            {columnVisibility.total_credits && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('total_credits')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Credits
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('total_credits') === 'asc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('total_credits') === 'desc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            {columnVisibility.credits_remaining && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('credits_remaining')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Credits left
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('credits_remaining') === 'asc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('credits_remaining') === 'desc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            {columnVisibility.total_cost && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('total_cost')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Cost
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('total_cost') === 'asc' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('total_cost') === 'desc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            {columnVisibility.subscription_plan && (
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Plan
              </th>
            )}
            {columnVisibility.subscription_status && (
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                Status
              </th>
            )}
            {columnVisibility.subscription_end && (
              <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                End Date
              </th>
            )}
            {columnVisibility.created_at && (
              <th className="px-spacing-3 py-spacing-2 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort('created_at')}
                  className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
                >
                  Created
                  <span className="inline-flex flex-col leading-none">
                    <ChevronUp
                      className={`icon-xs ${
                        getDir('created_at') === 'asc' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    />
                    <ChevronDown
                      className={`icon-xs -mt-[2px] ${
                        getDir('created_at') === 'desc'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </span>
                </button>
              </th>
            )}
            <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user.id} className="border-border border-t">
              {columnVisibility.email && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {user.email ?? '—'}
                </td>
              )}
              {columnVisibility.display_name && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  <Link href={`/users/user/${encodeURIComponent(user.id)}`} className="text-primary hover:underline">
                    {user.display_name ?? user.email ?? 'User dashboard'}
                  </Link>
                </td>
              )}
              {columnVisibility.role && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {user.role ?? '—'}
                </td>
              )}
              {columnVisibility.fly_machine_id && (
                <td className="px-spacing-3 py-spacing-2 body-3">
                  {user.fly_machine_id ? (
                    <a
                      href={FLY_MACHINE_LOGS_URL(user.fly_machine_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {user.fly_machine_id}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              )}
              {columnVisibility.total_tokens && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {formatNumber(user.total_tokens)}
                </td>
              )}
              {columnVisibility.total_credits && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {formatNumber(user.total_credits)}
                </td>
              )}
              {columnVisibility.credits_remaining && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {formatNumber(user.credits_remaining)}
                </td>
              )}
              {columnVisibility.total_cost && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {formatCost(user.total_cost)}
                </td>
              )}
              {columnVisibility.subscription_plan && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {user.subscription_plan ?? '—'}
                </td>
              )}
              {columnVisibility.subscription_status && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {user.subscription_status ?? '—'}
                </td>
              )}
              {columnVisibility.subscription_end && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {formatDate(user.subscription_end)}
                </td>
              )}
              {columnVisibility.created_at && (
                <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                  {formatDateTime(user.created_at)}
                </td>
              )}
              <td className="px-spacing-3 py-spacing-2 body-3">
                <div className="flex items-center gap-spacing-3 whitespace-nowrap">
                  <Link href={`/users/user/${encodeURIComponent(user.id)}`} className="text-primary hover:underline">
                    Dashboard
                  </Link>
                  <Link
                    href={`/traces?user_id=${encodeURIComponent(user.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Show traces
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
