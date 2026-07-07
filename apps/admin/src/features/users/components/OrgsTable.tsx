'use client'

import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { OrgRow } from '../types/orgs.types'

export type OrgSort =
  | 'created_at.desc'
  | 'created_at.asc'
  | 'name.asc'
  | 'name.desc'
  | 'slug.asc'
  | 'slug.desc'
  | 'account_type.asc'
  | 'account_type.desc'
  | 'status.asc'
  | 'status.desc'
  | 'owner_email.asc'
  | 'owner_email.desc'
  | 'total_tokens.asc'
  | 'total_tokens.desc'
  | 'total_credits.asc'
  | 'total_credits.desc'
  | 'credits_remaining.asc'
  | 'credits_remaining.desc'
  | 'total_cost.asc'
  | 'total_cost.desc'

interface OrgsTableProps {
  loading: boolean
  error: string | null
  rows: OrgRow[]
  currentSort: OrgSort
  onSortChange: (sort: OrgSort) => void
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

export function OrgsTable({ loading, error, rows, currentSort, onSortChange }: OrgsTableProps) {
  const getDir = (
    key:
      | 'name'
      | 'slug'
      | 'account_type'
      | 'status'
      | 'owner_email'
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
      | 'name'
      | 'slug'
      | 'account_type'
      | 'status'
      | 'owner_email'
      | 'created_at'
      | 'total_tokens'
      | 'total_credits'
      | 'credits_remaining'
      | 'total_cost',
  ) => {
    const dir = getDir(key)
    const next: Record<string, OrgSort> = {
      name: dir === 'asc' ? 'name.desc' : 'name.asc',
      slug: dir === 'asc' ? 'slug.desc' : 'slug.asc',
      account_type: dir === 'asc' ? 'account_type.desc' : 'account_type.asc',
      status: dir === 'asc' ? 'status.desc' : 'status.asc',
      owner_email: dir === 'asc' ? 'owner_email.desc' : 'owner_email.asc',
      created_at: dir === 'asc' ? 'created_at.desc' : 'created_at.asc',
      total_tokens: dir === 'asc' ? 'total_tokens.desc' : 'total_tokens.asc',
      total_credits: dir === 'asc' ? 'total_credits.desc' : 'total_credits.asc',
      credits_remaining: dir === 'asc' ? 'credits_remaining.desc' : 'credits_remaining.asc',
      total_cost: dir === 'asc' ? 'total_cost.desc' : 'total_cost.asc',
    }
    const sort = next[key]
    if (sort) onSortChange(sort)
  }

  const SortBtn = ({
    label,
    k,
  }: {
    label: string
    k:
      | 'name'
      | 'slug'
      | 'account_type'
      | 'status'
      | 'owner_email'
      | 'created_at'
      | 'total_tokens'
      | 'total_credits'
      | 'credits_remaining'
      | 'total_cost'
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="body-4 text-muted-foreground gap-spacing-1 hover:text-foreground inline-flex items-center font-medium"
    >
      {label}
      <span className="inline-flex flex-col leading-none">
        <ChevronUp
          className={`icon-xs ${getDir(k) === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`}
        />
        <ChevronDown
          className={`icon-xs -mt-[2px] ${
            getDir(k) === 'desc' ? 'text-foreground' : 'text-muted-foreground'
          }`}
        />
      </span>
    </button>
  )

  if (error) {
    return (
      <div className="py-spacing-8 flex items-center justify-center">
        <div className="text-center">
          <div className="body-2 text-destructive mb-spacing-2">Failed to load orgs</div>
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
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Name" k="name" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Slug" k="slug" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Type" k="account_type" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Status" k="status" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Owner" k="owner_email" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Tokens" k="total_tokens" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Credits" k="total_credits" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Credits left" k="credits_remaining" />
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Cost" k="total_cost" />
            </th>
            <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
              Plan
            </th>
            <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
              Sub status
            </th>
            <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
              End date
            </th>
            <th className="px-spacing-3 py-spacing-2 text-left">
              <SortBtn label="Created" k="created_at" />
            </th>
            <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground whitespace-nowrap text-left font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((org) => (
            <tr key={org.id} className="border-border border-t">
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                <Link href={`/users/org/${encodeURIComponent(org.id)}`} className="text-primary hover:underline">
                  {org.name ?? org.slug ?? 'Organization dashboard'}
                </Link>
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {org.slug ?? '—'}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {org.account_type ?? '—'}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {org.status ?? '—'}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {org.owner_email ?? '—'}
                {org.owner_display_name ? (
                  <div className="typo-caption text-muted-foreground">{org.owner_display_name}</div>
                ) : null}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {formatNumber(org.total_tokens)}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {formatNumber(org.total_credits)}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {formatNumber(org.credits_remaining)}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {formatCost(org.total_cost)}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {org.subscription_plan ?? '—'}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {org.subscription_status ?? '—'}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {formatDate(org.subscription_end)}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                {formatDateTime(org.created_at)}
              </td>
              <td className="px-spacing-3 py-spacing-2 body-3">
                <div className="flex items-center gap-spacing-3 whitespace-nowrap">
                  <Link href={`/users/org/${encodeURIComponent(org.id)}`} className="text-primary hover:underline">
                    Dashboard
                  </Link>
                  {org.owner_id ? (
                    <Link
                      href={`/traces?user_id=${encodeURIComponent(org.owner_id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Owner traces
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
