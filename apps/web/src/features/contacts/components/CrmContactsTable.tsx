'use client'

import type { CrmContactRow } from '@/features/contacts/services/crm-contacts-api'

type ColumnId =
  | 'name'
  | 'email'
  | 'phone'
  | 'created_at'
  | 'tags'
  | 'funnel'
  | 'source_domain'
  | 'contact_source'
  | 'contact_type'

type ColumnVisibility = Record<ColumnId, boolean>

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDisplayName(r: CrmContactRow): string {
  const first = r.first_name?.trim()
  const last = r.last_name?.trim()
  const full = [first, last].filter(Boolean).join(' ')
  return full || '—'
}

export function CrmContactsTable(props: {
  rows: CrmContactRow[]
  loading: boolean
  total: number
  hasMore: boolean
  columnVisibility: ColumnVisibility
  tagColorByName: Record<string, string>
  onLoadMore: () => void
  onRowClick: (id: string) => void
}) {
  const {
    rows,
    loading,
    total,
    hasMore,
    columnVisibility,
    tagColorByName,
    onLoadMore,
    onRowClick,
  } = props

  const buildGridTemplate = () => {
    const cols: string[] = []
    if (columnVisibility.name) cols.push('minmax(160px, 1fr)')
    if (columnVisibility.email) cols.push('minmax(220px, 1.2fr)')
    if (columnVisibility.phone) cols.push('minmax(140px, 0.8fr)')
    if (columnVisibility.created_at) cols.push('minmax(120px, 0.7fr)')
    if (columnVisibility.tags) cols.push('minmax(220px, 1fr)')
    if (columnVisibility.funnel) cols.push('minmax(200px, 1fr)')
    if (columnVisibility.source_domain) cols.push('minmax(200px, 1fr)')
    if (columnVisibility.contact_source) cols.push('minmax(160px, 0.8fr)')
    if (columnVisibility.contact_type) cols.push('minmax(120px, 0.6fr)')
    return cols.join(' ')
  }

  const gridTemplateColumns = buildGridTemplate()

  return (
    <div className="space-y-spacing-4">
      <div className="overflow-x-auto">
        {/* Header */}
        <div
          className="px-spacing-3 h-spacing-10 gap-spacing-4 typo-caption text-muted-foreground surface-card border-border rounded-spacing-3 mb-spacing-4 grid items-center border shadow-sm"
          style={{ gridTemplateColumns, minWidth: 'fit-content' }}
        >
          {columnVisibility.name && <div className="body-3">Name</div>}
          {columnVisibility.email && <div className="body-3">Email</div>}
          {columnVisibility.phone && <div className="body-3">Phone</div>}
          {columnVisibility.created_at && <div className="body-3">Created</div>}
          {columnVisibility.tags && <div className="body-3">Tags</div>}
          {columnVisibility.funnel && <div className="body-3">Funnel</div>}
          {columnVisibility.source_domain && <div className="body-3">Source Domain</div>}
          {columnVisibility.contact_source && <div className="body-3">Contact Source</div>}
          {columnVisibility.contact_type && <div className="body-3">Type</div>}
        </div>

        {rows.length === 0 ? (
          <div className="py-spacing-12 flex items-center justify-center">
            <div className="text-center">
              <div className="title-h6 mb-spacing-2">No contacts</div>
              <div className="typo-caption text-muted-foreground max-w-md">
                Contacts appear here when leads submit forms on your funnels.
              </div>
            </div>
          </div>
        ) : (
          <div
            className="border-border rounded-spacing-2 overflow-hidden border"
            style={{ minWidth: 'fit-content' }}
          >
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onRowClick(row.id)}
                className="w-full text-left"
              >
                <div
                  className="gap-spacing-4 px-spacing-3 py-spacing-2 border-border hover:bg-hover-subtle grid items-center border-b transition-colors last:border-b-0"
                  style={{ gridTemplateColumns }}
                >
                  {columnVisibility.name && (
                    <div className="body-3 text-foreground truncate font-medium">
                      {getDisplayName(row)}
                    </div>
                  )}
                  {columnVisibility.email && (
                    <div className="body-3 text-foreground truncate">{row.email}</div>
                  )}
                  {columnVisibility.phone && (
                    <div className="body-3 text-muted-foreground truncate">{row.phone || '—'}</div>
                  )}
                  {columnVisibility.created_at && (
                    <div className="body-3 text-muted-foreground">{formatDate(row.created_at)}</div>
                  )}
                  {columnVisibility.tags && (
                    <div className="min-w-0">
                      {Array.isArray(row.tags) && row.tags.length > 0 ? (
                        <div className="gap-spacing-1 flex flex-wrap">
                          {row.tags.slice(0, 3).map((t) => {
                            const color = tagColorByName[t]
                            return (
                              <span
                                key={t}
                                className="gap-spacing-1 px-spacing-2 py-spacing-1 body-4 surface-card border-border inline-flex items-center rounded-full border"
                              >
                                {color ? (
                                  <span
                                    className={`w-spacing-2 h-spacing-2 inline-block rounded-full tintbg-${color}`}
                                  />
                                ) : null}
                                <span className="truncate">{t}</span>
                              </span>
                            )
                          })}
                          {row.tags.length > 3 && (
                            <span className="badge-glass badge-glass-sm badge-glass-muted">
                              +{row.tags.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="body-3 text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                  {columnVisibility.funnel && (
                    <div className="body-3 text-foreground truncate">{row.funnel_title || '—'}</div>
                  )}
                  {columnVisibility.source_domain && (
                    <div className="body-3 text-muted-foreground truncate">
                      {row.source_domain || '—'}
                    </div>
                  )}
                  {columnVisibility.contact_source && (
                    <div className="body-3 text-muted-foreground truncate">
                      {row.contact_source || '—'}
                    </div>
                  )}
                  {columnVisibility.contact_type && (
                    <div className="body-3 text-muted-foreground truncate">
                      {row.contact_type || '—'}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {hasMore && rows.length > 0 && (
        <div className="pt-spacing-6 border-border flex justify-center border-t">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="button-glass-neutral px-spacing-6 py-spacing-2 body-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : `Load More Contacts (${rows.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  )
}
