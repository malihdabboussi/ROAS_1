'use client'

import { useMemo } from 'react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import {
  ACTION_SECTIONS,
  ALL_TRIGGER_SECTIONS_FOR_SEARCH,
  applyObjectToTrigger,
  defaultAction,
  defaultObjectForTriggerType,
  defaultTriggerForType,
  deriveContextsAfterActions,
  inferTriggerObject,
  sectionsForAvailableContexts,
  TRIGGER_OBJECT_OPTIONS,
  triggerSectionsForObject,
  type TriggerObjectKey,
} from '@/features/spaces/components/automations/automation-catalog'
import { AutomationCategorizedSelect } from '@/features/spaces/components/automations/AutomationCategorizedSelect'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
} from '@/features/spaces/types/space-schema'
import type { FlowBuilderCanvasStep } from '@/lib/flows/flow-builder-canvas.utils'
import {
  applyFlowConnectedAppEvent,
  buildFlowConnectedAppTrigger,
  FLOW_CONNECTED_APP_DEFS,
  flowConnectedAppEventOptions,
  resolveFlowConnectedAppDisplay,
  resolveFlowConnectedAppEventValue,
  resolveFlowConnectedAppKey,
  type FlowConnectedAppKey,
} from '@/lib/flows/flow-builder-connected-app-trigger.utils'
import {
  applyTriggerContextSpaceId,
  resolveTriggerContextSpaceId,
  triggerObjectRequiresContextSpace,
  type FlowTriggerContextSpace,
} from '@/lib/flows/flow-trigger-context-space.utils'
import { FlowCampaignGroupedSpaceSelect } from '../FlowCampaignGroupedSpaceSelect'
import { FlowBuilderStepIcon } from './FlowBuilderStepIcon'
import { FlowConnectedAppConnectField } from './FlowConnectedAppConnectField'

export function FlowBuilderStepSetupPanel({
  step,
  trigger,
  actions,
  fields: _fields,
  roster: _roster,
  triggerContextSpaces,
  flowSpaceId,
  flowSpaceIsConceptSandbox,
  editable,
  onChangeTrigger,
  onChangeActions,
}: {
  step: FlowBuilderCanvasStep
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  triggerContextSpaces: FlowTriggerContextSpace[]
  flowSpaceId: string
  flowSpaceIsConceptSandbox: boolean
  editable: boolean
  onChangeTrigger: (next: AutomationTrigger) => void
  onChangeActions: (next: AutomationAction[]) => void
}) {
  const Icon = step.icon

  if (step.selection.kind === 'trigger') {
    return (
      <TriggerSetupFields
        step={step}
        Icon={Icon}
        trigger={trigger}
        triggerContextSpaces={triggerContextSpaces}
        flowSpaceId={flowSpaceId}
        flowSpaceIsConceptSandbox={flowSpaceIsConceptSandbox}
        editable={editable}
        onChangeTrigger={onChangeTrigger}
      />
    )
  }

  const actionIndex = step.selection.index
  const action = actions[actionIndex]

  return (
    <ActionSetupFields
      step={step}
      Icon={Icon}
      trigger={trigger}
      actions={actions}
      actionIndex={actionIndex}
      action={action}
      editable={editable}
      onChangeActions={onChangeActions}
    />
  )
}

function TriggerSetupFields({
  step,
  Icon,
  trigger,
  triggerContextSpaces,
  flowSpaceId,
  flowSpaceIsConceptSandbox,
  editable,
  onChangeTrigger,
}: {
  step: FlowBuilderCanvasStep
  Icon: FlowBuilderCanvasStep['icon']
  trigger: AutomationTrigger
  triggerContextSpaces: FlowTriggerContextSpace[]
  flowSpaceId: string
  flowSpaceIsConceptSandbox: boolean
  editable: boolean
  onChangeTrigger: (next: AutomationTrigger) => void
}) {
  const isTriggerUnset = trigger.type === 'choose_action'
  const triggerObject = isTriggerUnset ? '' : inferTriggerObject(trigger)
  const eventSections = useMemo(
    () => (triggerObject ? triggerSectionsForObject(triggerObject) : []),
    [triggerObject],
  )
  const triggerPickerValue = isTriggerUnset
    ? ''
    : trigger.type === 'external_app_event'
      ? (trigger.trigger_slug ?? 'external_app_event')
      : trigger.type
  const connectedAppDisplay = resolveFlowConnectedAppDisplay(trigger)
  const connectedAppKey = resolveFlowConnectedAppKey(trigger) ?? ''
  const connectedAppEventValue = resolveFlowConnectedAppEventValue(trigger)
  const connectedAppEventOptions = useMemo(
    () => (connectedAppKey ? flowConnectedAppEventOptions(connectedAppKey) : []),
    [connectedAppKey],
  )
  const connectedAppSelectOptions = useMemo(
    () =>
      FLOW_CONNECTED_APP_DEFS.map((row) => ({
        value: row.key,
        label: row.label,
      })),
    [],
  )
  const showContextSpaceField = triggerObjectRequiresContextSpace(triggerObject)
  const contextSpaceId = resolveTriggerContextSpaceId({
    trigger,
    flowSpaceId,
    flowSpaceIsConceptSandbox,
  })
  const contextSpace =
    triggerContextSpaces.find((space) => space.id === contextSpaceId) ??
    triggerContextSpaces.find((space) => space.id === flowSpaceId) ??
    null

  const handleObjectChange = (next: string) => {
    onChangeTrigger(applyObjectToTrigger(trigger, next as TriggerObjectKey))
  }

  const handleTriggerTypeChange = (triggerType: string) => {
    const sectionsForCurrent = triggerObject ? triggerSectionsForObject(triggerObject) : []
    const inCurrent = sectionsForCurrent.some((section) =>
      section.options.some((option) => option.value === triggerType),
    )
    const targetObject =
      inCurrent && triggerObject ? triggerObject : defaultObjectForTriggerType(triggerType)
    onChangeTrigger(defaultTriggerForType(triggerType, targetObject))
  }

  return (
    <div className="gap-spacing-4 flex flex-col">
      <fieldset disabled={!editable} className="gap-spacing-3 m-0 flex flex-col border-0 p-0">
        <div>
          <p className="body-4 text-foreground mb-spacing-2 font-medium">
            Trigger on <span className="text-destructive">*</span>
          </p>
          <AutomationSolidSelect
            options={TRIGGER_OBJECT_OPTIONS as unknown as AutomationSolidOption[]}
            value={triggerObject}
            onChange={handleObjectChange}
            placeholder="What"
          />
        </div>

        {triggerObject === 'connected_apps' ? (
          <>
            <div>
              <p className="body-4 text-foreground mb-spacing-2 font-medium">
                Connect app <span className="text-destructive">*</span>
              </p>
              <AutomationSolidSelect
                options={connectedAppSelectOptions}
                value={connectedAppKey}
                onChange={(next) =>
                  onChangeTrigger(buildFlowConnectedAppTrigger(next as FlowConnectedAppKey))
                }
                placeholder="Select app"
              />
            </div>
            {connectedAppKey ? (
              <FlowConnectedAppConnectField
                appKey={connectedAppKey}
                trigger={trigger}
                eventLabel={connectedAppDisplay?.eventLabel}
                editable={editable}
                onChangeTrigger={onChangeTrigger}
              />
            ) : null}
            {connectedAppKey ? (
              <div>
                <p className="body-4 text-foreground mb-spacing-2 font-medium">
                  Trigger event <span className="text-destructive">*</span>
                </p>
                <AutomationSolidSelect
                  options={connectedAppEventOptions}
                  value={connectedAppEventValue}
                  onChange={(next) =>
                    onChangeTrigger(applyFlowConnectedAppEvent(trigger, connectedAppKey, next))
                  }
                  placeholder="When…"
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            {showContextSpaceField ? (
              <div>
                <p className="body-4 text-foreground mb-spacing-2 font-medium">
                  Space <span className="text-destructive">*</span>
                </p>
                {flowSpaceIsConceptSandbox ? (
                  <>
                    <FlowCampaignGroupedSpaceSelect
                      spaces={triggerContextSpaces}
                      value={contextSpaceId ?? ''}
                      onChange={(next) =>
                        onChangeTrigger(applyTriggerContextSpaceId(trigger, next))
                      }
                      placeholder="Select space"
                    />
                    <p className="body-4 text-muted-foreground mt-spacing-2">
                      Task statuses and fields come from this space. Publish or install this loop
                      into that space for it to run.
                    </p>
                  </>
                ) : (
                  <SetupAppCard
                    Icon={Icon}
                    badgeVariant={step.badgeVariant}
                    categoryLabel="Space"
                    logoSrc={step.logoSrc}
                    avatarSrc={step.avatarSrc}
                    name={contextSpace?.title ?? 'Space'}
                    description="This loop runs in this space. Configure uses its task statuses and fields."
                  />
                )}
              </div>
            ) : (
              <SetupAppCard
                Icon={Icon}
                badgeVariant={step.badgeVariant}
                categoryLabel={step.typeLabel}
                logoSrc={connectedAppDisplay?.logoSrc ?? step.logoSrc}
                avatarSrc={step.avatarSrc}
                name={connectedAppDisplay?.appLabel ?? step.typeLabel}
                description={
                  connectedAppDisplay?.eventLabel
                    ? `${connectedAppDisplay.eventLabel} — choose what starts this flow.`
                    : 'Choose what starts this flow and which event to listen for.'
                }
              />
            )}
            {triggerObject && triggerObject !== 'schedule' ? (
              <div>
                <p className="body-4 text-foreground mb-spacing-2 font-medium">
                  Trigger event <span className="text-destructive">*</span>
                </p>
                <AutomationCategorizedSelect
                  sections={eventSections}
                  crossScopeSections={ALL_TRIGGER_SECTIONS_FOR_SEARCH}
                  value={triggerPickerValue}
                  onChange={handleTriggerTypeChange}
                  placeholder="When…"
                  searchPlaceholder="Search triggers…"
                />
              </div>
            ) : null}
          </>
        )}
      </fieldset>
    </div>
  )
}

function ActionSetupFields({
  step,
  Icon,
  trigger,
  actions,
  actionIndex,
  action,
  editable,
  onChangeActions,
}: {
  step: FlowBuilderCanvasStep
  Icon: FlowBuilderCanvasStep['icon']
  trigger: AutomationTrigger
  actions: AutomationAction[]
  actionIndex: number
  action: AutomationAction | undefined
  editable: boolean
  onChangeActions: (next: AutomationAction[]) => void
}) {
  const availableContexts = deriveContextsAfterActions(trigger, actions, actionIndex)
  const actionSections = sectionsForAvailableContexts(ACTION_SECTIONS, availableContexts)
  const typeSelectValue = action?.type === 'choose_action' ? '' : (action?.type ?? '')

  const controlStepCategoryLabel =
    action?.type === 'flow_loop' || action?.type === 'flow_branch' ? 'Flow control' : step.typeLabel

  return (
    <div className="gap-spacing-4 flex flex-col">
      <SetupAppCard
        Icon={Icon}
        badgeVariant={step.badgeVariant}
        categoryLabel={controlStepCategoryLabel}
        logoSrc={step.logoSrc}
        avatarSrc={step.avatarSrc}
        name={step.label}
        description="Choose what this step should do in the flow."
      />
      <fieldset disabled={!editable} className="m-0 border-0 p-0">
        <p className="body-4 text-foreground mb-spacing-2 font-medium">
          Action event <span className="text-destructive">*</span>
        </p>
        <AutomationCategorizedSelect
          sections={actionSections}
          value={typeSelectValue}
          onChange={(type) => {
            const newAction = defaultAction(type)
            if (!newAction) return
            if (newAction.type === 'create_contact') {
              if (trigger.type === 'external_email_received') {
                newAction.email_template = '{{trigger.email}}'
                newAction.name_template = '{{trigger.name}}'
              }
              if (trigger.type === 'form_submitted') {
                newAction.email_template = '{{trigger.answers.email}}'
                newAction.name_template = '{{trigger.answers.name}}'
              }
            }
            if (newAction.type === 'create_task') {
              if (trigger.type === 'external_email_received') {
                newAction.title_template = '{{trigger.subject}}'
                newAction.notes_template =
                  'From: {{trigger.from}}\nCC: {{trigger.cc}}\n\n{{trigger.body}}'
              }
              if (trigger.type === 'external_slack_message_received') {
                newAction.title_template = '{{trigger.text}}'
              }
            }
            const next = [...actions]
            next[actionIndex] = newAction
            onChangeActions(next)
          }}
          placeholder="Choose an action"
          searchPlaceholder="Search actions…"
        />
      </fieldset>
    </div>
  )
}

function SetupAppCard({
  Icon,
  badgeVariant,
  categoryLabel,
  name,
  description,
  logoSrc,
  avatarSrc,
}: {
  Icon: FlowBuilderCanvasStep['icon']
  badgeVariant: FlowBuilderCanvasStep['badgeVariant']
  categoryLabel: string
  name: string
  description: string
  logoSrc?: string | null
  avatarSrc?: string | null
}) {
  return (
    <div className="section-card gap-spacing-3 p-spacing-3 flex items-start">
      <FlowBuilderStepIcon
        Icon={Icon}
        badgeVariant={badgeVariant}
        logoSrc={logoSrc}
        avatarSrc={avatarSrc}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="typo-caption text-muted-foreground font-semibold uppercase tracking-wide">
          {categoryLabel}
        </p>
        <p className="body-3 text-foreground mt-spacing-1 font-semibold">{name}</p>
        <p className="body-4 text-muted-foreground mt-spacing-1">{description}</p>
      </div>
    </div>
  )
}
