'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Brain,
  Calendar,
  CheckSquare,
  CircleAlert,
  ClipboardList,
  FilePenLine,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Power,
  Search,
  Users,
  Waypoints,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AutomationIntegrationLogo,
  AutomationTemplateVisual,
  getTemplateNavFilterLogoPath,
} from '@/components/flows/AutomationTemplateVisual'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import Switch from '@/components/ui/forms/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { fetchDistinctContactSourceValues } from '@/lib/contacts/contacts-api'
import {
  countTemplatesForNavFilter,
  filterAutomationTemplates,
  TEMPLATE_NAV_SECTIONS,
  type TemplateNavFilterId,
} from '@/lib/flows/automation-template-nav'
import type {
  AutomationTemplatePreset,
  AutomationTemplateTriggerGroup,
} from '@/lib/flows/automation-templates'
import {
  getConnectedAppFlowProviderLabel,
  getConnectedAppFlowTriggerBySlug,
} from '@/lib/flows/connected-app-flow-triggers'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { cn } from '@/lib/utils/cn'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { useSpaceCampaignName } from '../../hooks/use-space-campaign-name'
import { useSpacePermission } from '../../hooks/use-space-permission'
import { canEnableAutomation } from '../../lib/automation-publishable'
import { mergeContactsViewsPickerOptions } from '../../lib/contacts-automation-picker-options'
import {
  createAutomation,
  deleteAutomation,
  fetchAutomations,
  fetchAutomationTemplates,
  installAutomationTemplate as installAutomationTemplateFromApi,
  updateAutomation,
} from '../../services/automations.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import {
  DEFAULT_SPACE_SCHEMA,
  isSpaceFieldVisibleInUi,
  type FieldDef,
  type SpaceAutomation,
  type SpaceSchema,
} from '../../types/space-schema'
import { OptionDot } from '../OptionBadge'
import { AutomationRowActionsMenu } from './AutomationRowActionsMenu'
import { AutomationRuleEditor, type AutomationRuleEditorHandle } from './AutomationRuleEditor'
import { AutomationRunsLog } from './AutomationRunsLog'
import { AutomationsScopeDropdown } from './AutomationsScopeDropdown'

interface AutomationsPanelProps {
  spaceId: string
  open: boolean
  onClose: () => void
  roster: TeamRosterEntry[]
}

type DraftFilter = 'all' | 'draft' | 'published'
type EnabledFilter = 'all' | 'on' | 'off'
type UnsavedDialogTarget = 'panel' | 'editor'
const TRIGGER_FILTER_LABELS: Record<string, string> = {
  status_change: 'Status change',
  task_created: 'Task created',
  mission_completed: 'Agent completes',
  mission_failed: 'Agent fails',
  field_changed: 'Field changed',
  priority_changed: 'Priority changed',
  assignee_changed: 'Assignee changed',
  due_date_changed: 'Due date changed',
  start_date_changed: 'Start date changed',
  tag_added: 'Tag added',
  tag_removed: 'Tag removed',
  form_submitted: 'Form submitted',
  contact_created: 'Contact created',
  contact_updated: 'Contact updated',
  contact_tag_added: 'Contact tag added',
}

const TEMPLATE_NAV_HIDE_EMPTY_SECTIONS = new Set(['Connected apps', 'Internal triggers'])

function triggerTypeFilterLabel(type: string): string {
  return TRIGGER_FILTER_LABELS[type] ?? type.replace(/_/g, ' ')
}

export function AutomationsPanel({ spaceId, open, onClose, roster }: AutomationsPanelProps) {
  const spaces = useSpacesStore((s) => s.spaces)

  const [scopeSpaceId, setScopeSpaceId] = useState(spaceId)
  const [automations, setAutomations] = useState<SpaceAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [unsavedDialog, setUnsavedDialog] = useState<UnsavedDialogTarget | null>(null)
  const [draftBusy, setDraftBusy] = useState(false)
  const [rowActionsMenu, setRowActionsMenu] = useState<{
    automation: SpaceAutomation
    anchor: HTMLElement
  } | null>(null)
  const [panelTab, setPanelTab] = useState<'browse' | 'manage' | 'history'>('manage')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterDraft, setFilterDraft] = useState<DraftFilter>('all')
  const [filterEnabled, setFilterEnabled] = useState<EnabledFilter>('all')
  const [filterTriggerType, setFilterTriggerType] = useState<string | 'all'>('all')
  const [filterIncompleteOnly, setFilterIncompleteOnly] = useState(false)
  const [templateNavFilter, setTemplateNavFilter] = useState<TemplateNavFilterId>('all')
  const [templatePresets, setTemplatePresets] = useState<AutomationTemplatePreset[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [installingTemplateId, setInstallingTemplateId] = useState<string | null>(null)
  const [contactAutomationSourceValues, setContactAutomationSourceValues] = useState<string[]>([])
  const editorRef = useRef<AutomationRuleEditorHandle>(null)

  useEffect(() => {
    if (open) setScopeSpaceId(spaceId)
  }, [open, spaceId])

  useEffect(() => {
    const exists = spaces.some((sp) => sp.id === scopeSpaceId)
    if (!exists && open) setScopeSpaceId(spaceId)
  }, [spaces, scopeSpaceId, spaceId, open])

  const scopedSpace =
    spaces.find((sp) => sp.id === scopeSpaceId) ?? spaces.find((sp) => sp.id === spaceId) ?? null

  const effectiveSpaceId = scopedSpace?.id ?? spaceId

  const fieldsForAutomations = useMemo((): FieldDef[] => {
    const raw = scopedSpace?.schema
    if (!raw) return []
    const existingIds = new Set(raw.fields.map((f) => f.id))
    const missingFields = DEFAULT_SPACE_SCHEMA.fields.filter((f) => !existingIds.has(f.id))
    const merged: SpaceSchema =
      missingFields.length === 0 ? raw : { ...raw, fields: [...raw.fields, ...missingFields] }
    return merged.fields.filter(isSpaceFieldVisibleInUi)
  }, [scopedSpace?.schema])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetchDistinctContactSourceValues().then((values) => {
      if (!cancelled) setContactAutomationSourceValues(values)
    })
    return () => {
      cancelled = true
    }
  }, [open, effectiveSpaceId])

  const contactsTriggerPickers = useMemo((): ContactsTriggerPickers => {
    const views = scopedSpace?.schema?.views ?? []
    const { tagOptions, typeOptions } = mergeContactsViewsPickerOptions(views)
    const toSolid = (opts: typeof tagOptions): AutomationSolidOption[] =>
      opts.map((o) => ({
        value: o.id,
        label: o.label,
        leading: o.color ? <OptionDot color={o.color} size="sm" /> : undefined,
      }))
    return {
      tagOptions: [{ value: '', label: 'Any tag' }, ...toSolid(tagOptions)],
      typeOptions: [{ value: '', label: 'Any type' }, ...toSolid(typeOptions)],
      sourceOptions: [
        { value: '', label: 'Any source' },
        ...contactAutomationSourceValues.map((s) => ({ value: s, label: s })),
      ],
    }
  }, [scopedSpace?.schema?.views, contactAutomationSourceValues])

  const { switcherTree } = useSpaceCampaignName(scopedSpace ?? null)

  const space = scopedSpace

  useEffect(() => {
    setRowActionsMenu(null)
    setRenamingId(null)
    setFilterSearch('')
    setFilterDraft('all')
    setFilterEnabled('all')
    setFilterTriggerType('all')
    setFilterIncompleteOnly(false)
  }, [effectiveSpaceId])

  const perm = useSpacePermission(space)

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true
      if (!silent) setLoading(true)
      try {
        const list = await fetchAutomations(effectiveSpaceId)
        setAutomations(list)
      } catch {
        /* noop */
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [effectiveSpaceId],
  )

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const list = await fetchAutomationTemplates(effectiveSpaceId)
      setTemplatePresets(list)
    } catch {
      setTemplatePresets([])
    } finally {
      setTemplatesLoading(false)
    }
  }, [effectiveSpaceId])

  useEffect(() => {
    if (!open || panelTab !== 'browse') return
    void loadTemplates()
  }, [open, panelTab, loadTemplates])

  const sortedAutomations = useMemo(() => {
    return [...automations].sort((a, b) => {
      if (!!a.is_draft !== !!b.is_draft) return a.is_draft ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [automations])

  const triggerTypesInSpace = useMemo(() => {
    const s = new Set<string>()
    for (const a of automations) s.add(a.trigger.type)
    return [...s].sort()
  }, [automations])

  const draftFilterOptions = useMemo(
    () =>
      (
        [
          ['all', 'All statuses'],
          ['draft', 'Draft only'],
          ['published', 'Published'],
        ] as const
      ).map(([value, label]) => ({ value, label })),
    [],
  )

  const enabledFilterOptions = useMemo(
    () =>
      (
        [
          ['all', 'On & off'],
          ['on', 'On only'],
          ['off', 'Off only'],
        ] as const
      ).map(([value, label]) => ({ value, label })),
    [],
  )

  const triggerFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All triggers' },
      ...triggerTypesInSpace.map((tt) => ({ value: tt, label: triggerTypeFilterLabel(tt) })),
    ],
    [triggerTypesInSpace],
  )

  const visibleTemplatePresets = useMemo(
    () => filterAutomationTemplates(templateNavFilter, templatePresets),
    [templateNavFilter, templatePresets],
  )

  const filteredAutomations = useMemo(() => {
    const q = filterSearch.trim().toLowerCase()
    return sortedAutomations.filter((a) => {
      if (filterDraft === 'draft' && !a.is_draft) return false
      if (filterDraft === 'published' && !!a.is_draft) return false
      if (filterEnabled === 'on' && !a.enabled) return false
      if (filterEnabled === 'off' && a.enabled) return false
      if (filterTriggerType !== 'all' && a.trigger.type !== filterTriggerType) return false
      if (filterIncompleteOnly && canEnableAutomation(a).ok) return false
      if (q.length > 0) {
        const hay = `${a.name} ${describeTrigger(a.trigger)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    sortedAutomations,
    filterSearch,
    filterDraft,
    filterEnabled,
    filterTriggerType,
    filterIncompleteOnly,
  ])

  const automationNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of automations) map[a.id] = a.name
    return map
  }, [automations])

  const setAutomationEnabled = async (a: SpaceAutomation, enabled: boolean) => {
    if (enabled) {
      const gate = canEnableAutomation(a)
      if (!gate.ok) {
        toast.error(gate.message)
        return
      }
    }
    try {
      await updateAutomation(effectiveSpaceId, a.id, { enabled })
      await load({ silent: true })
    } catch (e) {
      toast.error(sanitizeUserError(e, FLOWS_UI.updateFailed))
    }
  }

  const commitRename = async (a: SpaceAutomation) => {
    if (renamingId !== a.id) return
    const trimmed = renameValue.trim()
    if (!trimmed) {
      toast.error('Add a name')
      setRenamingId(null)
      return
    }
    if (trimmed === a.name) {
      setRenamingId(null)
      return
    }
    try {
      if (a.is_draft) {
        await updateAutomation(effectiveSpaceId, a.id, { is_draft: true, name: trimmed })
      } else {
        await updateAutomation(effectiveSpaceId, a.id, { name: trimmed })
      }
      await load({ silent: true })
    } catch (e) {
      toast.error(sanitizeUserError(e, 'Could not rename'))
    } finally {
      setRenamingId(null)
    }
  }

  useEffect(() => {
    if (!open) setRowActionsMenu(null)
  }, [open])

  const handleDelete = async (id: string) => {
    await deleteAutomation(effectiveSpaceId, id)
    await load({ silent: true })
  }

  const handleSave = async (data: Omit<SpaceAutomation, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingId) {
      await updateAutomation(effectiveSpaceId, editingId, { ...data, is_draft: false })
    } else {
      await createAutomation(effectiveSpaceId, { ...data })
    }
    setEditingId(null)
    setCreating(false)
    await load({ silent: true })
  }

  const installAutomationTemplate = async (template: AutomationTemplatePreset) => {
    if (!perm.canEdit) return
    if (installingTemplateId) return
    setInstallingTemplateId(template.id)
    try {
      const created = await installAutomationTemplateFromApi(effectiveSpaceId, template.id)
      toast.success(`${template.title} installed`)
      await load({ silent: true })
      setCreating(false)
      setEditingId(created.id)
      setPanelTab('manage')
    } catch (e) {
      toast.error(sanitizeUserError(e, 'Could not install template'))
    } finally {
      setInstallingTemplateId(null)
    }
  }

  const editing = editingId ? automations.find((a) => a.id === editingId) : null
  const showEditor = creating || !!editing
  const allowSaveDraft = showEditor

  const exitEditorToList = useCallback(() => {
    setEditingId(null)
    setCreating(false)
  }, [])

  const finishClosePanel = useCallback(() => {
    exitEditorToList()
    onClose()
  }, [exitEditorToList, onClose])

  const requestClosePanel = useCallback(() => {
    if (!showEditor) {
      onClose()
      return
    }
    if (editorRef.current?.isDirty()) {
      setUnsavedDialog('panel')
      return
    }
    finishClosePanel()
  }, [showEditor, finishClosePanel, onClose])

  const requestLeaveEditor = useCallback(() => {
    if (!(editorRef.current?.isDirty() ?? false)) {
      exitEditorToList()
      return
    }
    setUnsavedDialog('editor')
  }, [exitEditorToList])

  const handleDiscardUnsaved = useCallback(() => {
    const target = unsavedDialog
    setUnsavedDialog(null)
    exitEditorToList()
    if (target === 'panel') onClose()
  }, [unsavedDialog, exitEditorToList, onClose])

  const handleSaveDraftFromDialog = useCallback(async () => {
    const target = unsavedDialog
    setDraftBusy(true)
    try {
      await editorRef.current?.saveDraft()
    } finally {
      setDraftBusy(false)
    }
    setUnsavedDialog(null)
    await load({ silent: true })
    exitEditorToList()
    if (target === 'panel') onClose()
  }, [unsavedDialog, load, exitEditorToList, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (unsavedDialog) {
        setUnsavedDialog(null)
        return
      }
      requestClosePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, unsavedDialog, requestClosePanel])

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  if (!open) return null

  const tree = (
    <div className="z-modal-dialog-root z-modal-layer-3 fixed inset-0 flex items-center justify-center">
      <div
        className="z-modal-dialog-backdrop-fill"
        onClick={requestClosePanel}
        role="presentation"
      />
      <div className="surface-card border-border z-modal-content rounded-spacing-4 relative mx-4 flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden border shadow-lg">
        {showEditor ? (
          <>
            <div className="px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between">
              <div className="gap-spacing-2 flex items-center">
                <Zap className="icon-lg text-muted-foreground" />
                <span className="body-1 text-foreground font-semibold">{FLOWS_UI.feature}</span>
              </div>
              <button
                type="button"
                onClick={requestClosePanel}
                className="btn-icon-bare"
                aria-label="Close"
              >
                <X className="icon-xs" />
              </button>
            </div>
            <AutomationRuleEditor
              ref={editorRef}
              key={creating ? 'create' : `edit-${editingId}`}
              spaceId={effectiveSpaceId}
              campaignId={space?.campaign_id ?? null}
              editingAutomationId={editingId}
              isCreating={creating}
              initial={editing ?? undefined}
              fields={fieldsForAutomations}
              roster={roster}
              contactsTriggerPickers={contactsTriggerPickers}
              onSave={handleSave}
              onCancel={requestLeaveEditor}
            />
          </>
        ) : (
          <Tabs
            value={panelTab}
            onValueChange={(v) => setPanelTab(v as 'browse' | 'manage' | 'history')}
            className="gap-spacing-0 flex min-h-0 flex-1 flex-col"
          >
            <div className="px-spacing-6 py-spacing-4 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center">
              {scopedSpace ? (
                <AutomationsScopeDropdown
                  activeSpace={scopedSpace}
                  switcherTree={switcherTree}
                  onSelectSpace={setScopeSpaceId}
                />
              ) : (
                <span aria-hidden className="min-w-0" />
              )}
              <TabsList variant="liquid" className="w-auto shrink-0">
                <TabsTrigger value="browse">{FLOWS_UI.browseTab}</TabsTrigger>
                <TabsTrigger value="manage">{FLOWS_UI.manageTab}</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <div className="flex justify-end">
                <Link
                  href={`/flows?space_id=${encodeURIComponent(effectiveSpaceId)}`}
                  onClick={onClose}
                  className="button-default button-glass mr-spacing-2"
                >
                  <Workflow className="icon-xs" />
                  Open in Flows
                </Link>
                <button
                  type="button"
                  onClick={requestClosePanel}
                  className="btn-icon-bare"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>
            <TabsContent value="browse" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {templatesLoading ? (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <VibeyLoadingOrb text="Loading templates…" state="processing" size="md" />
                </div>
              ) : (
                <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
                  <div className="p-spacing-2 min-h-0">
                    <FlowsPanelSidebar
                      canEdit={perm.canEdit}
                      onAddFlow={() => setCreating(true)}
                      showTemplateNav
                      templateNavFilter={templateNavFilter}
                      onTemplateNavFilter={setTemplateNavFilter}
                      templatePresets={templatePresets}
                    />
                  </div>
                  <div className="p-spacing-2 pl-spacing-4 min-h-0 overflow-y-auto">
                    {visibleTemplatePresets.length === 0 ? (
                      <div className="py-spacing-8 flex min-h-[200px] flex-col items-center justify-center text-center">
                        <p className="body-3 text-muted-foreground">
                          No templates in this category.
                        </p>
                      </div>
                    ) : (
                      <div className="gap-spacing-3 grid grid-cols-2">
                        {visibleTemplatePresets.map((template) => {
                          const PresetIcon = templatePresetIcon(template)
                          const installing = installingTemplateId === template.id
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => installAutomationTemplate(template)}
                              disabled={!perm.canEdit || !!installingTemplateId}
                              aria-busy={installing}
                              className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 hover:bg-hover-subtle flex h-full cursor-pointer flex-col items-stretch text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="gap-spacing-2 flex items-center">
                                <AutomationTemplateVisual
                                  template={template}
                                  FallbackIcon={PresetIcon}
                                />
                                <span className="body-2 text-foreground min-w-0 flex-1 font-semibold leading-snug">
                                  {template.title}
                                </span>
                                {installing ? (
                                  <span className="badge-glass badge-glass-sm badge-glass-blue gap-spacing-1 inline-flex shrink-0 items-center">
                                    <Loader2 className="icon-xs animate-spin" />
                                    Installing
                                  </span>
                                ) : null}
                              </span>
                              <span className="body-3 text-muted-foreground line-clamp-3 block">
                                {template.description}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="manage" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="gap-spacing-3 px-spacing-6 py-spacing-3 flex shrink-0 flex-wrap items-center">
                  <div className="gap-spacing-3 flex min-w-0 flex-1 flex-wrap items-center">
                    <div className="border-border focus-within:border-primary h-spacing-7 px-spacing-2 gap-spacing-2 rounded-spacing-2 bg-background flex min-w-[10rem] max-w-56 shrink-0 items-center border transition-colors">
                      <Search className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                      <input
                        type="search"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        placeholder="Search name or trigger..."
                        className="body-4 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
                        aria-label={FLOWS_UI.searchAria}
                      />
                      {filterSearch ? (
                        <button
                          type="button"
                          onClick={() => setFilterSearch('')}
                          className="btn-icon-bare shrink-0"
                          aria-label="Clear search"
                        >
                          <X className="icon-xs" />
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      aria-label={FLOWS_UI.filtersAria}
                    >
                      <AutomationSolidSelect
                        variant="icon"
                        triggerIcon={<FilePenLine className="icon-sm shrink-0" />}
                        tooltip="Draft status"
                        tooltipSide="top"
                        active={filterDraft !== 'all'}
                        menuWidth="min200"
                        options={draftFilterOptions}
                        value={filterDraft}
                        onChange={(v) => setFilterDraft(v as DraftFilter)}
                        placeholder="Status"
                        ariaLabel="Filter by draft status"
                      />
                      <AutomationSolidSelect
                        variant="icon"
                        triggerIcon={<Power className="icon-sm shrink-0" />}
                        tooltip="On or off"
                        tooltipSide="top"
                        active={filterEnabled !== 'all'}
                        menuWidth="min200"
                        options={enabledFilterOptions}
                        value={filterEnabled}
                        onChange={(v) => setFilterEnabled(v as EnabledFilter)}
                        placeholder="On / off"
                        ariaLabel="Filter by on or off"
                      />
                      <AutomationSolidSelect
                        variant="icon"
                        triggerIcon={<Waypoints className="icon-sm shrink-0" />}
                        tooltip="Trigger type"
                        tooltipSide="top"
                        active={filterTriggerType !== 'all'}
                        menuWidth="min200"
                        options={triggerFilterOptions}
                        value={filterTriggerType}
                        onChange={(v) => setFilterTriggerType(v)}
                        placeholder="Trigger"
                        ariaLabel="Filter by trigger type"
                      />
                      <Tooltip label="Incomplete only" side="top" triggerClassName="inline-flex">
                        <span className="inline-flex">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={filterIncompleteOnly}
                            onClick={() => setFilterIncompleteOnly((v) => !v)}
                            className={cn(
                              'btn-icon-bare shrink-0',
                              filterIncompleteOnly
                                ? 'btn-icon-glass--active'
                                : 'hover:bg-hover-subtle',
                            )}
                            aria-label={FLOWS_UI.incompleteOnlyAria}
                          >
                            <CircleAlert className="icon-sm shrink-0" aria-hidden />
                          </button>
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="py-spacing-8 flex min-h-[240px] flex-1 items-center justify-center">
                      <VibeyLoadingOrb text={FLOWS_UI.loading} state="processing" size="md" />
                    </div>
                  ) : automations.length === 0 ? (
                    <div className="gap-spacing-3 px-spacing-6 flex min-h-[200px] flex-col items-center justify-center text-center">
                      <Zap className="icon-lg text-muted-foreground opacity-40" />
                      <p className="body-2 text-muted-foreground">{FLOWS_UI.emptyList}</p>
                    </div>
                  ) : filteredAutomations.length === 0 ? (
                    <div className="gap-spacing-3 px-spacing-6 flex min-h-[200px] flex-col items-center justify-center text-center">
                      <Zap className="icon-lg text-muted-foreground opacity-40" />
                      <p className="body-2 text-muted-foreground">{FLOWS_UI.emptyFilter}</p>
                    </div>
                  ) : (
                    <div className="space-y-spacing-1 p-spacing-3">
                      {filteredAutomations.map((a) => {
                        const enableGate = canEnableAutomation(a)
                        const cannotTurnOn = !a.enabled && !enableGate.ok
                        const canMutate = perm.canMutateAutomation(a)
                        return (
                          <div
                            key={a.id}
                            onClick={() => {
                              if (renamingId === a.id) return
                              setEditingId(a.id)
                            }}
                            className="hover:bg-hover-subtle gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 flex cursor-pointer items-center transition-colors"
                          >
                            <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
                              {renamingId === a.id ? (
                                <input
                                  autoFocus
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onBlur={() => void commitRename(a)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                    if (e.key === 'Escape') {
                                      setRenamingId(null)
                                      setRenameValue(a.name)
                                    }
                                  }}
                                  className="border-border focus:border-primary h-spacing-9 px-spacing-3 body-2 text-foreground rounded-spacing-2 bg-background focus:ring-ring focus-visible:ring-ring w-full min-w-0 border outline-none ring-0 focus:outline-none focus:ring-2 focus-visible:outline-none"
                                />
                              ) : (
                                <span className="body-2 gap-spacing-2 text-foreground flex flex-wrap items-center font-medium">
                                  {a.name}
                                  {a.is_draft ? (
                                    <span className="badge-glass badge-glass-sm badge-glass-muted shrink-0">
                                      Draft
                                    </span>
                                  ) : null}
                                </span>
                              )}
                              <span className="typo-caption text-muted-foreground">
                                {describeTrigger(a.trigger)} → {a.actions.length} action
                                {a.actions.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="gap-spacing-2 flex shrink-0 items-center">
                              <span
                                className="inline-flex"
                                onClick={(e) => e.stopPropagation()}
                                title={
                                  a.enabled ? 'On' : enableGate.ok ? 'Off' : enableGate.message
                                }
                              >
                                <Switch
                                  checked={a.enabled}
                                  disabled={cannotTurnOn || !canMutate}
                                  onCheckedChange={(on) => void setAutomationEnabled(a, on)}
                                />
                              </span>
                              {canMutate ? (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const anchor = e.currentTarget
                                      setRowActionsMenu((cur) =>
                                        cur?.automation.id === a.id
                                          ? null
                                          : { automation: a, anchor },
                                      )
                                    }}
                                    className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 inline-flex items-center justify-center p-1 transition-colors"
                                    aria-expanded={
                                      !!rowActionsMenu && rowActionsMenu.automation.id === a.id
                                    }
                                    aria-haspopup="menu"
                                    aria-label={FLOWS_UI.actionsAria}
                                  >
                                    <MoreVertical className="icon-sm" />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="history" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AutomationRunsLog
                spaceId={effectiveSpaceId}
                open={panelTab === 'history'}
                automationNames={automationNames}
              />
            </TabsContent>
          </Tabs>
        )}

        <AutomationRowActionsMenu
          open={Boolean(rowActionsMenu)}
          anchor={rowActionsMenu?.anchor ?? null}
          onClose={() => setRowActionsMenu(null)}
          onRename={() => {
            const row = rowActionsMenu
            if (!row) return
            setRenameValue(row.automation.name)
            setRenamingId(row.automation.id)
          }}
          onEdit={() => {
            const row = rowActionsMenu
            if (!row) return
            setEditingId(row.automation.id)
          }}
          onDelete={() => {
            const row = rowActionsMenu
            if (!row) return
            void handleDelete(row.automation.id)
          }}
        />

        {unsavedDialog ? (
          <div className="z-modal-layer-3 p-spacing-4 absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              className="bg-modal-overlay z-modal-backdrop absolute inset-0"
              aria-label="Dismiss"
              onClick={() => setUnsavedDialog(null)}
            />
            <div className="surface-card border-border rounded-spacing-4 p-spacing-6 z-modal-content relative w-full max-w-md border shadow-xl">
              <div className="gap-spacing-2 mb-spacing-2 flex items-start justify-between">
                <h3 className="body-1 text-foreground min-w-0 flex-1 font-semibold">
                  Unsaved changes
                </h3>
                <button
                  type="button"
                  onClick={() => setUnsavedDialog(null)}
                  className="btn-icon-bare shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
              <p className="body-3 text-muted-foreground mb-spacing-6">
                {allowSaveDraft
                  ? 'Save a draft to continue later, or discard your progress.'
                  : 'You have unsaved edits. Discard them or close to keep editing.'}
              </p>
              <div className="gap-spacing-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleDiscardUnsaved}
                  className="button-default button-glass-destructive"
                >
                  Discard
                </button>
                {allowSaveDraft ? (
                  <button
                    type="button"
                    disabled={draftBusy}
                    onClick={() => void handleSaveDraftFromDialog()}
                    className="button-default button-glass-primary disabled:opacity-40"
                  >
                    {draftBusy ? 'Saving…' : 'Save as draft'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  return portalTarget ? createPortal(tree, portalTarget) : null
}

interface FlowsPanelSidebarProps {
  canEdit: boolean
  onAddFlow: () => void
  showTemplateNav?: boolean
  templateNavFilter?: TemplateNavFilterId
  onTemplateNavFilter?: (filterId: TemplateNavFilterId) => void
  templatePresets?: AutomationTemplatePreset[]
}

function FlowsPanelSidebar({
  canEdit,
  onAddFlow,
  showTemplateNav = false,
  templateNavFilter = 'all',
  onTemplateNavFilter,
  templatePresets = [],
}: FlowsPanelSidebarProps) {
  return (
    <aside className="border-border bg-muted/10 rounded-spacing-3 flex h-full min-h-0 flex-col overflow-hidden border">
      {canEdit ? (
        <div className="p-spacing-2 shrink-0">
          <button
            type="button"
            onClick={onAddFlow}
            className="badge-glass badge-glass-green body-3 rounded-spacing-2 flex w-full items-center justify-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
            aria-label={FLOWS_UI.addFlow}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            {FLOWS_UI.addFlow}
          </button>
        </div>
      ) : null}
      {showTemplateNav ? (
        <div
          className={cn(
            'scrollbar-hide gap-spacing-6 p-spacing-2 flex min-h-0 flex-1 flex-col overflow-y-auto',
            canEdit && 'pt-0',
          )}
        >
          {TEMPLATE_NAV_SECTIONS.map((section, sectionIndex) => {
            const visibleItems = section.items.filter((item) => {
              if (!TEMPLATE_NAV_HIDE_EMPTY_SECTIONS.has(section.title)) return true
              return countTemplatesForNavFilter(item.id, templatePresets) > 0
            })
            if (visibleItems.length === 0) return null
            return (
              <div key={section.title}>
                {sectionIndex > 0 ? <div className="border-border mb-spacing-3 border-t" /> : null}
                <div className="px-3 pb-1 pt-1">
                  <span className="text-[10px] font-medium tracking-wider text-[var(--color-muted-foreground)]">
                    {section.title}
                  </span>
                </div>
                <div>
                  {visibleItems.map((item) => {
                    const selected = item.id === templateNavFilter
                    const count = countTemplatesForNavFilter(item.id, templatePresets)
                    const navLogo = getTemplateNavFilterLogoPath(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onTemplateNavFilter?.(item.id)}
                        className={cn(
                          'nav-glass-hover-purple body-3 rounded-spacing-2 py-spacing-1 flex w-full items-center justify-between gap-2 px-3 text-left transition-all',
                          selected
                            ? 'nav-glass-selected-purple nav-glass-text-purple'
                            : 'text-[var(--color-muted-foreground)]',
                        )}
                      >
                        <span className="gap-spacing-2 flex min-w-0 items-center">
                          {navLogo ? (
                            <AutomationIntegrationLogo
                              src={navLogo}
                              name={item.label}
                              className="h-spacing-4 w-spacing-4"
                            />
                          ) : null}
                          <span className="min-w-0 truncate">{item.label}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--color-muted-foreground)]">
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </aside>
  )
}

function templatePresetIcon(template: AutomationTemplatePreset) {
  if (template.triggerGroup) return templateTriggerGroupIcon(template.triggerGroup)
  return Zap
}

function templateTriggerGroupIcon(group: AutomationTemplateTriggerGroup) {
  switch (group) {
    case 'forms':
      return ClipboardList
    case 'contacts':
      return Users
    case 'tasks':
      return CheckSquare
    case 'artifacts':
      return Package
    case 'schedule':
      return Calendar
    case 'brain':
      return Brain
  }
}

function describeTrigger(trigger: SpaceAutomation['trigger']): string {
  switch (trigger.type) {
    case 'status_change':
      return `When status → ${trigger.to || '…'}${trigger.from ? ` (from ${trigger.from})` : ''}`
    case 'task_created':
      return trigger.in_status ? `When task created in ${trigger.in_status}` : 'When task created'
    case 'mission_completed':
      return 'When agent completes'
    case 'mission_failed':
      return 'When agent fails'
    case 'field_changed':
      return `When ${trigger.field_id || '…'} changes${trigger.to ? ` to ${trigger.to}` : ''}`
    case 'priority_changed':
      return trigger.to
        ? `When priority → ${trigger.to}${trigger.from ? ` (from ${trigger.from})` : ''}`
        : 'When priority changes'
    case 'assignee_changed':
      if (trigger.assignee_type === 'unassigned') return 'When assignee becomes unassigned'
      if (trigger.assignee_type === 'agent') return 'When assigned to agent'
      if (trigger.assignee_type === 'human') return 'When assigned to person'
      return 'When assignee changes'
    case 'due_date_changed':
      return trigger.to ? `When due date → ${trigger.to}` : 'When due date changes'
    case 'start_date_changed':
      return trigger.to ? `When start date → ${trigger.to}` : 'When start date changes'
    case 'tag_added':
      return trigger.tag ? `When tag added: ${trigger.tag}` : 'When tag added'
    case 'tag_removed':
      return trigger.tag ? `When tag removed: ${trigger.tag}` : 'When tag removed'
    case 'form_submitted':
      return 'When form is submitted'
    case 'contact_created':
      return 'When contact is created'
    case 'contact_updated':
      return trigger.field_id
        ? `When contact field ${trigger.field_id} updates`
        : 'When contact is updated'
    case 'contact_tag_added':
      return trigger.tag ? `When contact tag added: ${trigger.tag}` : 'When contact tag added'
    case 'contact_tag_removed':
      return trigger.tag ? `When contact tag removed: ${trigger.tag}` : 'When contact tag removed'
    case 'contact_type_changed':
      return trigger.to ? `When contact type → ${trigger.to}` : 'When contact type changes'
    case 'contact_source_changed':
      return trigger.to ? `When contact source → ${trigger.to}` : 'When contact source changes'
    case 'artifact_lifecycle':
      return 'When artifact lifecycle event'
    case 'external_email_received':
      return trigger.provider === 'outlook'
        ? 'When Outlook email received'
        : 'When Gmail email received'
    case 'external_slack_message_received':
      return 'When Slack message received'
    case 'external_fathom_recording_ready':
      return 'When Fathom recording is ready'
    case 'external_app_event': {
      const meta = trigger.trigger_slug
        ? getConnectedAppFlowTriggerBySlug(trigger.trigger_slug)
        : null
      const providerLabel =
        meta?.providerLabel ??
        (trigger.provider ? getConnectedAppFlowProviderLabel(trigger.provider) : 'Connected app')
      const eventLabel = meta?.eventLabel ?? '…'
      return `${providerLabel}: ${eventLabel}`
    }
    case 'schedule':
      return 'On a schedule'
    default:
      return triggerTypeFilterLabel((trigger as { type: string }).type)
  }
}
