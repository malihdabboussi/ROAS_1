'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ArrowLeft, Bot, Search } from 'lucide-react'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { useCachedMissionAgents } from '@/lib/agents/use-mission-agents'
import type { MissionAgentSidebar } from '@/lib/agents/mission-agents-api'
import {
  FLOW_BUILDER_STEP_CATEGORIES,
  FLOW_BUILDER_STEP_SIDEBAR,
  type FlowBuilderStepSidebarId,
} from '@/lib/flows/flow-builder-step-types.utils'
import {
  buildFlowBuilderBuiltInTools,
  buildFlowBuilderIntegrationApp,
  buildFlowBuilderIntegrationCatalogApps,
  buildFlowBuilderProductTools,
  buildFlowBuilderSpaceTriggerEvents,
  filterPickerApps,
  filterPickerAppsTriggersOnly,
  filterPickerBuiltIns,
  FLOW_BUILDER_HOME_POPULAR_INTEGRATIONS,
  splitPickerAppsByConnection,
  type FlowBuilderPickerApp,
  type FlowBuilderPickerBuiltIn,
  type FlowBuilderPickerEvent,
  type FlowBuilderPickerSelection,
} from '@/lib/flows/flow-builder-picker-catalog.utils'
import { useFlowBuilderConnectedIntegrations } from '../../hooks/use-flow-builder-connected-integrations'
import { cn } from '@/lib/utils/cn'

export function FlowBuilderAddStepPicker({
  open,
  onClose,
  onSelect,
  allowTriggers = false,
  triggersOnly = false,
}: {
  open: boolean
  onClose: () => void
  onSelect: (selection: FlowBuilderPickerSelection) => void
  allowTriggers?: boolean
  triggersOnly?: boolean
}) {
  const [sidebarId, setSidebarId] = useState<FlowBuilderStepSidebarId>('home')
  const [query, setQuery] = useState('')
  const [focusedAppId, setFocusedAppId] = useState<string | null>(null)
  const { connectedIntegrationIds, isPlatformAdmin, reload: reloadConnectedIntegrations } =
    useFlowBuilderConnectedIntegrations(open)
  const { data: missionAgents = [], loading: agentsLoading } = useCachedMissionAgents(open)

  useEffect(() => {
    if (!open) return
    setSidebarId('home')
    setQuery('')
    setFocusedAppId(null)
    void reloadConnectedIntegrations()
  }, [open, reloadConnectedIntegrations])

  const integrationApps = useMemo(
    () =>
      buildFlowBuilderIntegrationCatalogApps({
        allowTriggers,
        connectedIntegrationIds,
        isPlatformAdmin,
      }),
    [allowTriggers, connectedIntegrationIds, isPlatformAdmin],
  )
  const builtInTools = useMemo(() => buildFlowBuilderBuiltInTools(), [])
  const productTools = useMemo(() => buildFlowBuilderProductTools(), [])
  const spaceTriggerEvents = useMemo(() => buildFlowBuilderSpaceTriggerEvents(), [])

  const sidebarRows = useMemo(
    () =>
      triggersOnly
        ? FLOW_BUILDER_STEP_SIDEBAR.filter((row) => ['home', 'integrations'].includes(row.id))
        : FLOW_BUILDER_STEP_SIDEBAR,
    [triggersOnly],
  )

  const triggerBuiltIns = useMemo(
    () => builtInTools.filter((row) => row.id === 'webhook'),
    [builtInTools],
  )

  const popularApps = useMemo(() => {
    const rows = FLOW_BUILDER_HOME_POPULAR_INTEGRATIONS.map((id) => {
      const catalogApp = integrationApps.find((app) => app.id === id)
      if (catalogApp) return catalogApp
      return buildFlowBuilderIntegrationApp(
        id,
        id,
        allowTriggers,
        connectedIntegrationIds.has(id),
      )
    })
    if (triggersOnly) return filterPickerAppsTriggersOnly(rows)
    if (allowTriggers) return rows
    return rows.filter((app) => app.events.some((event) => event.selection.kind !== 'trigger'))
  }, [allowTriggers, connectedIntegrationIds, integrationApps, triggersOnly])

  const filteredApps = useMemo(() => {
    const rows = filterPickerApps(integrationApps, query, allowTriggers)
    if (triggersOnly) return filterPickerAppsTriggersOnly(rows)
    if (allowTriggers) return rows
    return rows.filter((app) => app.events.some((event) => !event.disabled))
  }, [allowTriggers, integrationApps, query, triggersOnly])
  const filteredBuiltIns = useMemo(
    () => filterPickerBuiltIns(triggersOnly ? triggerBuiltIns : builtInTools, query),
    [builtInTools, query, triggerBuiltIns, triggersOnly],
  )
  const filteredProducts = useMemo(
    () => filterPickerBuiltIns(productTools, query),
    [productTools, query],
  )

  const focusedApp = useMemo(() => {
    const app = focusedAppId
      ? (integrationApps.find((row) => row.id === focusedAppId) ?? null)
      : null
    if (!app || !triggersOnly) return app
    return {
      ...app,
      events: app.events.filter((event) => event.selection.kind === 'trigger'),
    }
  }, [focusedAppId, integrationApps, triggersOnly])

  const filteredSpaceTriggers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return spaceTriggerEvents
    return spaceTriggerEvents.filter(
      (event) =>
        event.label.toLowerCase().includes(q) ||
        (event.description?.toLowerCase().includes(q) ?? false),
    )
  }, [query, spaceTriggerEvents])

  const pickerTitle = triggersOnly ? 'Select a trigger' : 'Add a step'

  const showAppEvents = sidebarId === 'integrations' && focusedApp !== null

  const handleSelect = (selection: FlowBuilderPickerSelection) => {
    onSelect(selection)
    onClose()
  }

  const handleSelectEvent = (event: FlowBuilderPickerEvent) => {
    if (event.disabled) return
    handleSelect(event.selection)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-inert" />
        <DialogPrimitive.Content className="z-modal-layer-3 z-modal-dialog-root fixed inset-0 flex items-center justify-center overflow-visible">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{pickerTitle}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div
            className="z-modal-dialog-backdrop-fill"
            role="presentation"
            aria-hidden
            onClick={onClose}
          />

          <div className="p-spacing-4 pointer-events-none relative z-10 flex h-full min-h-0 w-full items-center justify-center">
            <div
              className="flow-builder-picker-dialog-wrap pointer-events-auto relative flex items-start"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="surface-card wizard-container-border rounded-spacing-4 flow-builder-picker-dialog-shell relative flex w-full flex-col overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label={pickerTitle}
              >
                <div className="flow-builder-picker-body">
                  <nav className="flow-builder-picker-sidebar" aria-label="Step categories">
                    {sidebarRows.map((row) => {
                      const Icon = row.icon
                      const selected = sidebarId === row.id && !showAppEvents
                      return (
                        <button
                          key={row.id}
                          type="button"
                          className={cn(
                            'flow-builder-picker-sidebar-item',
                            selected && 'flow-builder-picker-sidebar-item-selected',
                          )}
                          onClick={() => {
                            setSidebarId(row.id)
                            setFocusedAppId(null)
                          }}
                        >
                          <Icon className="icon-sm shrink-0" />
                          <span className="truncate">{row.label}</span>
                        </button>
                      )
                    })}
                  </nav>

                  <div className="flow-builder-picker-main">
                    <div className="flow-builder-picker-search-wrap">
                      {showAppEvents ? (
                        <button
                          type="button"
                          className="flow-builder-picker-back"
                          onClick={() => setFocusedAppId(null)}
                        >
                          <ArrowLeft className="icon-sm shrink-0" />
                          All integrations
                        </button>
                      ) : null}
                      <Search className="icon-sm text-muted-foreground shrink-0" />
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={
                          triggersOnly
                            ? 'Search triggers and integrations…'
                            : 'Search integrations and tools…'
                        }
                        className="flow-builder-picker-search-input"
                        autoFocus
                      />
                    </div>

                    <div
                      className={cn(
                        'flow-builder-picker-list-scroll',
                        sidebarId === 'home' && !showAppEvents && 'flow-builder-picker-list-scroll-home',
                      )}
                    >
                      {showAppEvents && focusedApp ? (
                        <AppEventsPanel
                          app={focusedApp}
                          triggersOnly={triggersOnly}
                          onSelectEvent={handleSelectEvent}
                        />
                      ) : sidebarId === 'home' ? (
                        <HomePanel
                          popularApps={triggersOnly ? filterPickerAppsTriggersOnly(popularApps) : popularApps}
                          builtIns={filteredBuiltIns}
                          products={triggersOnly ? [] : filteredProducts}
                          spaceTriggers={triggersOnly ? filteredSpaceTriggers : []}
                          query={query}
                          onOpenApp={(appId) => {
                            setSidebarId('integrations')
                            setFocusedAppId(appId)
                          }}
                          onSelectBuiltIn={(id) => handleSelect({ kind: 'category', categoryId: id })}
                          onSelectEvent={handleSelectEvent}
                        />
                      ) : sidebarId === 'integrations' ? (
                        <IntegrationsListPanel
                          apps={filteredApps}
                          spaceTriggers={triggersOnly ? filteredSpaceTriggers : []}
                          onSelectSpaceTrigger={handleSelectEvent}
                          onOpenApp={setFocusedAppId}
                        />
                      ) : sidebarId === 'agents' ? (
                        <AgentsPickerPanel
                          agents={missionAgents}
                          loading={agentsLoading}
                          query={query}
                          onSelectAgent={(agent) =>
                            handleSelect({
                              kind: 'action',
                              action: {
                                type: 'send_to_agent',
                                agent_key: agent.agent_key,
                                prompt_template: '',
                              },
                            })
                          }
                        />
                      ) : sidebarId === 'flow_controls' ? (
                        <BuiltInListPanel
                          title="Flow controls"
                          rows={filteredBuiltIns.filter((row) =>
                            ['branch', 'loop', 'human-gate'].includes(row.id),
                          )}
                          onSelect={(id) => handleSelect({ kind: 'category', categoryId: id })}
                        />
                      ) : sidebarId === 'utilities' ? (
                        <BuiltInListPanel
                          title="Utilities"
                          rows={[
                            ...filteredBuiltIns.filter((row) => ['webhook', 'action'].includes(row.id)),
                            ...filteredProducts.filter((row) =>
                              ['skill', 'brain', 'space'].includes(row.id),
                            ),
                          ]}
                          onSelect={(id) => handleSelect({ kind: 'category', categoryId: id })}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function HomePanel({
  popularApps,
  builtIns,
  products,
  spaceTriggers,
  query,
  onOpenApp,
  onSelectBuiltIn,
  onSelectEvent,
}: {
  popularApps: FlowBuilderPickerApp[]
  builtIns: FlowBuilderPickerBuiltIn[]
  products: FlowBuilderPickerBuiltIn[]
  spaceTriggers: FlowBuilderPickerEvent[]
  query: string
  onOpenApp: (appId: string) => void
  onSelectBuiltIn: (id: FlowBuilderPickerBuiltIn['id']) => void
  onSelectEvent: (event: FlowBuilderPickerEvent) => void
}) {
  const filteredPopular = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = !q
      ? popularApps
      : popularApps.filter((app) => app.label.toLowerCase().includes(q))
    return [...rows].sort((a, b) => {
      if (a.connected !== b.connected) return a.connected ? -1 : 1
      return a.label.localeCompare(b.label)
    })
  }, [popularApps, query])

  return (
    <div className="flow-builder-picker-home-grid">
      {spaceTriggers.length > 0 ? (
        <>
          <PickerColumn title="Space">
            {spaceTriggers.map((event) => (
              <TriggerEventRow key={event.id} event={event} onSelect={() => onSelectEvent(event)} />
            ))}
          </PickerColumn>
          <PickerColumn title="Popular integrations">
            {filteredPopular.map((app) => (
              <AppRow key={app.id} app={app} onClick={() => onOpenApp(app.id)} />
            ))}
          </PickerColumn>
          <PickerColumn title="Other">
            {builtIns.map((row) => (
              <BuiltInRow key={row.id} row={row} onClick={() => onSelectBuiltIn(row.id)} />
            ))}
          </PickerColumn>
        </>
      ) : (
        <>
          <PickerColumn title="Popular integrations">
            {filteredPopular.map((app) => (
              <AppRow key={app.id} app={app} onClick={() => onOpenApp(app.id)} />
            ))}
          </PickerColumn>
          <PickerColumn title="Built-in tools">
            {builtIns.map((row) => (
              <BuiltInRow key={row.id} row={row} onClick={() => onSelectBuiltIn(row.id)} />
            ))}
          </PickerColumn>
          <PickerColumn title="ROAS tools">
            {products.filter((row) => row.id !== 'agent').map((row) => (
              <BuiltInRow key={row.id} row={row} onClick={() => onSelectBuiltIn(row.id)} />
            ))}
          </PickerColumn>
        </>
      )}
    </div>
  )
}

function TriggerEventRow({
  event,
  onSelect,
}: {
  event: FlowBuilderPickerEvent
  onSelect: () => void
}) {
  return (
    <button type="button" className="flow-builder-picker-app-row" onClick={onSelect}>
      <span className="body-3 text-foreground min-w-0 flex-1 truncate text-left">{event.label}</span>
    </button>
  )
}

function IntegrationsListPanel({
  apps,
  spaceTriggers = [],
  onSelectSpaceTrigger,
  onOpenApp,
}: {
  apps: FlowBuilderPickerApp[]
  spaceTriggers?: FlowBuilderPickerEvent[]
  onSelectSpaceTrigger?: (event: FlowBuilderPickerEvent) => void
  onOpenApp: (appId: string) => void
}) {
  if (apps.length === 0 && spaceTriggers.length === 0) {
    return <EmptyMatches />
  }

  const { connected, available } = splitPickerAppsByConnection(apps)

  return (
    <div className="gap-spacing-6 flex flex-col">
      {spaceTriggers.length > 0 && onSelectSpaceTrigger ? (
        <section className="flow-builder-picker-section">
          <p className="flow-builder-picker-section-title">Workspace</p>
          <ul className="flow-builder-picker-section-list">
            {spaceTriggers.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  className="flow-builder-picker-item"
                  onClick={() => onSelectSpaceTrigger(event)}
                >
                  <span className="min-w-0 flex-1 text-left">
                    <span className="body-3 text-foreground block font-medium">{event.label}</span>
                    {event.description ? (
                      <span className="body-4 text-muted-foreground mt-spacing-1 block">
                        {event.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {connected.length > 0 ? (
        <IntegrationsListSection
          title="Workspace connections"
          apps={connected}
          onOpenApp={onOpenApp}
        />
      ) : null}
      {available.length > 0 ? (
        <IntegrationsListSection
          title={
            connected.length > 0 || spaceTriggers.length > 0
              ? 'All integrations'
              : 'Integrations'
          }
          apps={available}
          onOpenApp={onOpenApp}
        />
      ) : null}
    </div>
  )
}

function IntegrationsListSection({
  title,
  apps,
  onOpenApp,
}: {
  title: string
  apps: FlowBuilderPickerApp[]
  onOpenApp: (appId: string) => void
}) {
  return (
    <section className="flow-builder-picker-section">
      <p className="flow-builder-picker-section-title">{title}</p>
      <div className="gap-spacing-2 flex flex-col">
        {apps.map((app) => (
          <IntegrationPickerRow key={app.id} app={app} onClick={() => onOpenApp(app.id)} />
        ))}
      </div>
    </section>
  )
}

function IntegrationPickerRow({
  app,
  onClick,
}: {
  app: FlowBuilderPickerApp
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border rounded-spacing-2 px-spacing-4 py-spacing-3 hover:bg-hover-subtle gap-spacing-3 flex w-full items-center border text-left transition-colors"
    >
      <IntegrationPickerLogo integrationId={app.id} name={app.label} />
      <span className="min-w-0 flex-1">
        <span className="title-h6 block font-medium">{app.label}</span>
        {app.description ? (
          <span className="body-3 text-muted-foreground line-clamp-1 block">{app.description}</span>
        ) : null}
      </span>
      {app.connected ? (
        <span className="badge-glass badge-glass-green shrink-0">Connected</span>
      ) : null}
    </button>
  )
}

function AgentsPickerPanel({
  agents,
  loading,
  query,
  onSelectAgent,
}: {
  agents: MissionAgentSidebar[]
  loading: boolean
  query: string
  onSelectAgent: (agent: MissionAgentSidebar) => void
}) {
  const rows = useMemo(() => {
    const active = agents.filter((agent) => agent.is_active !== false)
    const q = query.trim().toLowerCase()
    if (!q) return active
    return active.filter(
      (agent) =>
        agent.name.toLowerCase().includes(q) ||
        agent.agent_key.toLowerCase().includes(q) ||
        (agent.role?.toLowerCase().includes(q) ?? false),
    )
  }, [agents, query])

  if (loading) {
    return <p className="body-4 text-muted-foreground p-spacing-6 text-center">Loading agents…</p>
  }

  if (rows.length === 0) {
    return (
      <p className="body-4 text-muted-foreground p-spacing-6 text-center">
        No agents match your search.
      </p>
    )
  }

  return (
    <section className="flow-builder-picker-section">
      <p className="flow-builder-picker-section-title">Your agents</p>
      <ul className="flow-builder-picker-section-list">
        {rows.map((agent) => (
          <li key={agent.id}>
            <button
              type="button"
              className="flow-builder-picker-item"
              onClick={() => onSelectAgent(agent)}
            >
              <AgentPickerAvatar agent={agent} />
              <span className="min-w-0 flex-1 text-left">
                <span className="body-3 text-foreground block font-medium">{agent.name}</span>
                <span className="body-4 text-muted-foreground mt-spacing-1 block">
                  {agent.role?.trim() || agent.agent_key}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AgentPickerAvatar({ agent }: { agent: MissionAgentSidebar }) {
  if (agent.image_url) {
    return (
      <span className="inline-flex h-spacing-8 w-spacing-8 shrink-0 overflow-hidden rounded-full">
        <img src={agent.image_url} alt="" className="h-full w-full object-cover" />
      </span>
    )
  }
  return (
    <span className="bg-muted text-muted-foreground inline-flex h-spacing-8 w-spacing-8 shrink-0 items-center justify-center rounded-full">
      <Bot className="icon-sm" />
    </span>
  )
}

function IntegrationPickerLogo({
  integrationId,
  name,
  size = 'md',
}: {
  integrationId: string
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const logoPath = getIntegrationLogoPath(integrationId)
  const boxClass =
    size === 'lg' ? 'h-spacing-10 w-spacing-10' : size === 'sm' ? 'h-spacing-8 w-spacing-8' : 'h-spacing-10 w-spacing-10'
  const imgClass =
    size === 'lg' ? 'h-spacing-7 w-spacing-7' : size === 'sm' ? 'h-spacing-4 w-spacing-4' : 'h-spacing-7 w-spacing-7'

  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', boxClass)}>
      {logoPath ? (
        <img src={logoPath} alt={`${name} logo`} className={cn('block object-contain object-center', imgClass)} />
      ) : (
        <span className="typo-caption text-muted-foreground font-medium">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  )
}

function AppEventsPanel({
  app,
  triggersOnly = false,
  onSelectEvent,
}: {
  app: FlowBuilderPickerApp
  triggersOnly?: boolean
  onSelectEvent: (event: FlowBuilderPickerEvent) => void
}) {
  return (
    <section>
      <div className="gap-spacing-3 px-spacing-3 py-spacing-2 flex items-center">
        <IntegrationPickerLogo integrationId={app.id} name={app.label} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="body-2 text-foreground font-semibold">{app.label}</p>
          <p className="body-4 text-muted-foreground">
            {app.connected
              ? triggersOnly
                ? 'Choose a trigger to configure'
                : 'Choose a trigger or action to configure'
              : 'Connect in Settings, then configure this step'}
          </p>
        </div>
        {app.connected ? (
          <span className="badge-glass badge-glass-sm badge-glass-green shrink-0">Connected</span>
        ) : null}
      </div>
      <ul className="flow-builder-picker-section-list">
        {app.events.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              className={cn(
                'flow-builder-picker-item',
                event.disabled && 'flow-builder-picker-item-disabled',
              )}
              disabled={event.disabled}
              onClick={() => onSelectEvent(event)}
            >
              <span className="min-w-0 flex-1 text-left">
                <span className="body-3 text-foreground block font-medium">{event.label}</span>
                {event.description ? (
                  <span className="body-4 text-muted-foreground mt-spacing-1 block">
                    {event.description}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function BuiltInListPanel({
  title,
  rows,
  onSelect,
}: {
  title: string
  rows: FlowBuilderPickerBuiltIn[]
  onSelect: (id: FlowBuilderPickerBuiltIn['id']) => void
}) {
  if (rows.length === 0) return <EmptyMatches />
  const categoryById = Object.fromEntries(
    FLOW_BUILDER_STEP_CATEGORIES.map((row) => [row.id, row]),
  ) as Record<string, (typeof FLOW_BUILDER_STEP_CATEGORIES)[number]>

  return (
    <section className="flow-builder-picker-section">
      <p className="flow-builder-picker-section-title">{title}</p>
      <ul className="flow-builder-picker-section-list">
        {rows.map((row) => {
          const category = categoryById[row.id]
          const Icon = category?.icon
          return (
            <li key={row.id}>
              <button
                type="button"
                className="flow-builder-picker-item"
                onClick={() => onSelect(row.id)}
              >
                {Icon ? (
                  <span
                    className={cn(
                      'flow-builder-add-step-menu-icon',
                      `flow-builder-add-step-menu-icon-${row.badgeVariant}`,
                    )}
                  >
                    <Icon className="icon-sm" />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 text-left">
                  <span className="body-3 text-foreground block font-medium">{row.label}</span>
                  <span className="body-4 text-muted-foreground mt-spacing-1 block">
                    {row.description}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PickerColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flow-builder-picker-column">
      <p className="flow-builder-picker-section-title">{title}</p>
      <div className="flow-builder-picker-column-list">{children}</div>
    </section>
  )
}

function AppRow({
  app,
  onClick,
}: {
  app: FlowBuilderPickerApp
  onClick: () => void
}) {
  return (
    <button type="button" className="flow-builder-picker-app-row" onClick={onClick}>
      <IntegrationPickerLogo integrationId={app.id} name={app.label} size="sm" />
      <span className="body-3 text-foreground truncate">{app.label}</span>
    </button>
  )
}

function BuiltInRow({
  row,
  onClick,
}: {
  row: FlowBuilderPickerBuiltIn
  onClick: () => void
}) {
  const category = FLOW_BUILDER_STEP_CATEGORIES.find((item) => item.id === row.id)
  const Icon = category?.icon
  return (
    <button type="button" className="flow-builder-picker-app-row" onClick={onClick}>
      {Icon ? (
        <span
          className={cn(
            'flow-builder-add-step-menu-icon',
            `flow-builder-add-step-menu-icon-${row.badgeVariant}`,
          )}
        >
          <Icon className="icon-sm" />
        </span>
      ) : null}
      <span className="body-3 text-foreground truncate">{row.label}</span>
    </button>
  )
}

function EmptyMatches() {
  return <p className="body-4 text-muted-foreground p-spacing-6 text-center">No matches</p>
}
