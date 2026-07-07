'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { fetchSharedSpace, type SharedSpaceResponse } from '../../services/spaces.service'
import type { SpaceItem } from '../../types'
import {
  DEFAULT_TASK_VISIBLE_FIELD_IDS,
  type FieldDef,
  type SelectOption,
  type SpaceSchema,
  type ViewDef,
} from '../../types/space-schema'
import { DocsView } from '../DocsView'
import { KanbanView } from '../KanbanView'
import { ListView } from '../ListView'
import { RestrictedViewPlaceholder } from './RestrictedViewPlaceholder'

const RESTRICTED = new Set<ViewDef['type']>([
  'missions',
  'contacts',
  'instagram_research',
  'tiktok_research',
  'campaign_overview',
  'social_reporting',
  'funnel_analytics',
  'email_analytics',
  'ads_performance',
  'finance_overview',
])

const CHANNEL_VIEW_TYPES = new Set<ViewDef['type']>(['channels', 'channel'])

function fallbackView(schema: SpaceSchema): ViewDef {
  return (
    schema.views?.[0] ?? {
      id: 'list',
      type: 'list',
      name: 'List',
      visible_fields: [...DEFAULT_TASK_VISIBLE_FIELD_IDS],
    }
  )
}

function mapRoster(rows: SharedSpaceResponse['roster']): TeamRosterEntry[] {
  const now = new Date().toISOString()
  return rows.map((r) => ({
    participant_id: r.participant_id,
    kind: r.kind,
    org_id: null,
    user_id: r.user_id,
    agent_key: r.agent_key,
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    role_label: null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: null,
    created_at: now,
    updated_at: null,
  }))
}

export function SharedSpaceItemsView({ token }: { token: string }) {
  const searchParams = useSearchParams()
  const [payload, setPayload] = useState<SharedSpaceResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<SpaceItem | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchSharedSpace(token)
      .then((d) => {
        if (!cancelled) {
          setPayload(d)
          setErr(null)
        }
      })
      .catch(() => {
        if (!cancelled) setErr('Link unavailable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const noopUpdate = useCallback(async (_itemId: string, _payload: Partial<SpaceItem>) => {}, [])
  const noopPushToAgent = useCallback(
    async (
      _itemId: string,
      _options?: import('../cells/MissionSendDropdown').MissionSendOptions,
    ) => {},
    [],
  )
  const noopViewPatch = useCallback(async (_patch: Partial<ViewDef>) => {}, [])
  const noopDeleteItem = useCallback(async (_itemId: string) => {}, [])
  const noopCreateOption = useCallback(async (_fieldId: string, _option: SelectOption) => {}, [])
  const noopUpdateOption = useCallback(
    async (_fieldId: string, _optionId: string, _updates: Partial<SelectOption>) => {},
    [],
  )
  const noopDeleteOption = useCallback(async (_fieldId: string, _optionId: string) => {}, [])
  const noopTagSwatches = useCallback(async (_fieldId: string, _swatches: string[]) => {}, [])
  const noopAddInGroup = useCallback(
    async (
      _title: string,
      _groupFieldId: string,
      _groupKey: string,
      _fieldExtras?: Record<string, unknown>,
    ) => {},
    [],
  )

  const schema = (payload?.space.schema ?? {}) as SpaceSchema
  const views = schema.views ?? []
  const vParam = searchParams.get('v')
  const requestedView = useMemo(
    () => (vParam ? views.find((v) => v.id === vParam) : undefined),
    [views, vParam],
  )
  const activeView = useMemo(() => {
    if (!views.length) return fallbackView(schema)
    return requestedView ?? views[0]!
  }, [schema, views, requestedView])
  const viewScoped = Boolean(requestedView)
  const sharedDocsCanOpen = Boolean(
    viewScoped && activeView.type === 'docs' && activeView.docs_config?.public_doc_access_enabled,
  )

  useEffect(() => {
    setSelectedDoc(null)
  }, [activeView.id])

  const fieldsById = useMemo(() => {
    const fields = (schema.fields ?? []) as FieldDef[]
    return new Map(fields.map((f) => [f.id, f]))
  }, [schema.fields])

  const allFields = useMemo(() => [...fieldsById.values()], [fieldsById])

  const roster = useMemo(() => (payload ? mapRoster(payload.roster) : []), [payload])

  const visibleFields = useMemo(() => {
    const ids = activeView.visible_fields ?? [...DEFAULT_TASK_VISIBLE_FIELD_IDS]
    return ids.map((id) => fieldsById.get(id)).filter(Boolean) as FieldDef[]
  }, [activeView.visible_fields, fieldsById])

  const items = (payload?.items ?? []) as SpaceItem[]
  const docItems = useMemo(
    () =>
      items.filter(
        (i) => (i.custom_data as Record<string, unknown> | undefined)?._view_type === 'doc',
      ),
    [items],
  )

  if (loading) {
    return (
      <div className="px-spacing-6 py-spacing-12 flex flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading shared space…" state="processing" size="lg" />
      </div>
    )
  }
  if (err || !payload) {
    return (
      <div className="body-3 px-spacing-6 py-spacing-8 text-[var(--color-muted-foreground)]">
        {err ?? 'Link unavailable'}
      </div>
    )
  }

  const campaignLabel = payload.campaign?.name

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="px-spacing-6 py-spacing-4 border-b border-[var(--color-border)]">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {viewScoped ? 'SHARED VIEW' : 'SHARED SPACE'}
        </p>
        <h1 className="mt-1 text-xl font-semibold uppercase text-[var(--foreground)]">
          {viewScoped ? activeView.name : payload.space.title}
        </h1>
        {viewScoped ? (
          <p className="body-3 mt-1 text-[var(--color-muted-foreground)]">
            {payload.space.title}
            {campaignLabel ? ` · ${campaignLabel}` : ''}
          </p>
        ) : campaignLabel ? (
          <p className="body-3 mt-1 text-[var(--color-muted-foreground)]">{campaignLabel}</p>
        ) : null}
      </header>

      {!viewScoped ? (
        <div className="px-spacing-4 py-spacing-2 scrollbar-thin flex min-h-0 w-full min-w-0 shrink-0 gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-[var(--color-border)]">
          {views.map((v) => {
            const active = v.id === activeView.id
            const href =
              v.id === activeView.id
                ? `/shared/space/${token}`
                : `/shared/space/${token}?v=${encodeURIComponent(v.id)}`
            return (
              <Link
                key={v.id}
                href={href}
                className={
                  active
                    ? 'badge-glass-blue body-3 px-spacing-3 py-spacing-1 rounded-full'
                    : 'body-3 px-spacing-3 py-spacing-1 rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]'
                }
              >
                {v.name}
              </Link>
            )
          })}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {CHANNEL_VIEW_TYPES.has(activeView.type) ? (
          <div className="px-spacing-6 py-spacing-10 flex min-h-[320px] flex-col items-center justify-center">
            <div className="card-glass px-spacing-6 py-spacing-8 max-w-md rounded-xl border border-[var(--color-border)] text-center">
              <p className="body-3 text-[var(--foreground)]">
                Channels are not available in shared views.
              </p>
              <p className="body-4 mt-spacing-2 text-[var(--color-muted-foreground)]">
                Open this space in Vibey to keep private chats protected.
              </p>
            </div>
          </div>
        ) : RESTRICTED.has(activeView.type) ? (
          <RestrictedViewPlaceholder viewLabel={activeView.name} />
        ) : activeView.type === 'docs' && selectedDoc ? (
          <article className="px-spacing-6 py-spacing-6 mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedDoc(null)}
              className="body-3 mb-spacing-4 px-spacing-2 py-spacing-1 w-fit rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            >
              Back to docs
            </button>
            <div className="p-spacing-6 min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--background)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Shared doc
              </p>
              <h2 className="mt-spacing-1 text-2xl font-semibold text-[var(--foreground)]">
                {selectedDoc.title || 'Untitled'}
              </h2>
              <div
                className="prose prose-sm dark:prose-invert mt-spacing-6 max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    typeof selectedDoc.doc_body === 'string' && selectedDoc.doc_body.trim()
                      ? selectedDoc.doc_body
                      : '<p>No content.</p>',
                }}
              />
            </div>
          </article>
        ) : activeView.type === 'docs' ? (
          <DocsView
            view={activeView}
            items={docItems}
            fieldsById={fieldsById}
            allFields={allFields}
            visibleFields={visibleFields}
            roster={roster}
            currentUserId={null}
            onOpenDetail={sharedDocsCanOpen ? setSelectedDoc : undefined}
            onViewPatch={noopViewPatch}
            onUpdateItem={noopUpdate}
            onDeleteItem={noopDeleteItem}
            onPushToAgent={noopPushToAgent}
            onCreateOption={noopCreateOption}
            onUpdateOption={noopUpdateOption}
            onDeleteOption={noopDeleteOption}
            onTagCustomSwatchesChange={noopTagSwatches}
            onEditCategories={undefined}
            onEditStatuses={undefined}
            onAddField={undefined}
            campaignId={null}
            onCampaignDocsRefresh={undefined}
            readOnly
            readOnlyOpenItems={sharedDocsCanOpen}
          />
        ) : activeView.type === 'kanban' ? (
          <KanbanView
            view={activeView}
            items={items}
            fieldsById={fieldsById}
            roster={roster}
            currentUserId={null}
            onUpdateItem={noopUpdate}
            onAddItemInGroup={noopAddInGroup}
            onPushToAgent={noopPushToAgent}
            onCreateSubtask={async () => {}}
            readOnly
          />
        ) : (
          <ListView
            items={items}
            visibleFields={visibleFields}
            roster={roster}
            currentUserId={null}
            onUpdateItem={noopUpdate}
            onPushToAgent={noopPushToAgent}
            activeView={activeView}
            allFields={allFields}
            onViewChange={noopViewPatch}
            onAddItemInGroup={noopAddInGroup}
            onDeleteItem={noopDeleteItem}
            surface={activeView.type === 'table' ? 'table' : 'list'}
            readOnly
          />
        )}
      </div>
    </div>
  )
}
