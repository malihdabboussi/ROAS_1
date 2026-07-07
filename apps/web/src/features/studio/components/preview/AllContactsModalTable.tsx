import { Check, Users } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { CrmContactRow } from '../../services/leads.service'

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDisplayName(row: CrmContactRow): string {
  const first = row.first_name?.trim()
  const last = row.last_name?.trim()
  return [first, last].filter(Boolean).join(' ') || '\u2014'
}

type AllContactsModalTableProps = {
  rows: CrmContactRow[]
  total: number
  loading: boolean
  selected: Set<string>
  hasMore: boolean
  tagColorByName: Record<string, string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onLoadMore: () => void
}

export function AllContactsModalTable({
  rows,
  total,
  loading,
  selected,
  hasMore,
  tagColorByName,
  onToggleSelect,
  onToggleSelectAll,
  onLoadMore,
}: AllContactsModalTableProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading contacts..." />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Users className="text-muted-foreground mx-auto mb-spacing-3 h-spacing-12 w-spacing-12 opacity-30" />
          <p className="body-2 text-muted-foreground">No contacts found</p>
        </div>
      </div>
    )
  }

  const allSelected = selected.size === rows.length && rows.length > 0

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10">
          <tr className="bg-card">
            <th className="w-spacing-12 px-spacing-4 py-spacing-2 text-center">
              <button
                type="button"
                onClick={onToggleSelectAll}
                className="hover:bg-hover-subtle rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center"
                aria-label={allSelected ? 'Deselect all on this page' : 'Select all on this page'}
              >
                <span
                  className={`rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center border border-dotted ${
                    allSelected ? 'border-primary/50' : 'border-border'
                  }`}
                  aria-hidden
                >
                  {allSelected ? (
                    <Check className="icon-xs text-primary" aria-hidden />
                  ) : (
                    <div className="icon-xs" aria-hidden />
                  )}
                </span>
              </button>
            </th>
            <th className="typo-caption text-muted-foreground px-spacing-4 py-spacing-2 text-left uppercase tracking-wider">
              Name
            </th>
            <th className="typo-caption text-muted-foreground px-spacing-4 py-spacing-2 text-left uppercase tracking-wider">
              Email
            </th>
            <th className="typo-caption text-muted-foreground px-spacing-4 py-spacing-2 text-left uppercase tracking-wider">
              Phone
            </th>
            <th className="typo-caption text-muted-foreground px-spacing-4 py-spacing-2 text-left uppercase tracking-wider">
              Tags
            </th>
            <th className="typo-caption text-muted-foreground px-spacing-4 py-spacing-2 text-left uppercase tracking-wider">
              Source
            </th>
            <th className="typo-caption text-muted-foreground px-spacing-4 py-spacing-2 text-left uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selected.has(row.id)
            return (
              <tr
                key={row.id}
                className={`border-border cursor-pointer border-b transition-colors ${
                  isSelected ? 'bg-primary/5' : 'hover:bg-hover-subtle'
                }`}
                onClick={() => onToggleSelect(row.id)}
              >
                <td
                  className="w-spacing-12 px-spacing-4 py-spacing-2 text-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onToggleSelect(row.id)}
                    className="hover:bg-hover-subtle rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center"
                    aria-label={isSelected ? 'Deselect contact' : 'Select contact'}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={`rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center border border-dotted ${
                        isSelected ? 'border-primary/50' : 'border-border'
                      }`}
                      aria-hidden
                    >
                      {isSelected ? (
                        <Check className="icon-xs text-primary" aria-hidden />
                      ) : (
                        <div className="icon-xs" aria-hidden />
                      )}
                    </span>
                  </button>
                </td>
                <td className="body-3 text-foreground px-spacing-4 py-spacing-2 font-medium">
                  {getDisplayName(row)}
                </td>
                <td className="body-3 text-foreground px-spacing-4 py-spacing-2">{row.email}</td>
                <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-2">
                  {row.phone || '\u2014'}
                </td>
                <td className="px-spacing-4 py-spacing-2">
                  {Array.isArray(row.tags) && row.tags.length > 0 ? (
                    <div className="gap-spacing-1 flex flex-wrap">
                      {row.tags.slice(0, 2).map((tag) => {
                        const color = tagColorByName[tag]
                        return (
                          <span
                            key={tag}
                            className="body-4 surface-card border-border inline-flex items-center gap-spacing-1 rounded-full border px-spacing-2 py-spacing-0-5"
                          >
                            {color ? (
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full tintbg-${color}`}
                              />
                            ) : null}
                            <span className="max-w-[60px] truncate">{tag}</span>
                          </span>
                        )
                      })}
                      {row.tags.length > 2 ? (
                        <span className="body-4 text-muted-foreground">
                          +{row.tags.length - 2}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="body-3 text-muted-foreground">{'\u2014'}</span>
                  )}
                </td>
                <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-2">
                  {row.funnel_title || row.source_domain || '\u2014'}
                </td>
                <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-2">
                  {formatDate(row.created_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {hasMore ? (
        <div className="py-spacing-4 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="button-glass-neutral body-3 rounded-lg px-spacing-6 py-spacing-2 font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load more (${rows.length} of ${total})`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
