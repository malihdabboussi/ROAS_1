import type { AutomationTrigger } from '@/features/spaces/types/space-schema'
import type { TriggerObjectKey } from '@/features/spaces/components/automations/automation-catalog'
import {
  inferTriggerObject,
  TASK_SHAPED_TRIGGER_TYPES,
} from '@/features/spaces/components/automations/automation-catalog'
import type { SpaceSchemaSummary } from '@/lib/spaces/spaces-api'
import { flowAutomationFieldsForSpace } from '@/features/flows/lib/flow-space-fields'

export type FlowTriggerContextSpace = {
  id: string
  title?: string | null
  campaign_id?: string | null
  schema?: SpaceSchemaSummary | null
}

const TASK_TRIGGER_OBJECTS = new Set<TriggerObjectKey>(['tasks', 'subtasks', 'all_tasks'])

export function triggerObjectRequiresContextSpace(
  triggerObject: TriggerObjectKey | '',
): triggerObject is TriggerObjectKey {
  return triggerObject !== '' && TASK_TRIGGER_OBJECTS.has(triggerObject)
}

export function isTaskShapedAutomationTrigger(trigger: AutomationTrigger): boolean {
  return TASK_SHAPED_TRIGGER_TYPES.has(trigger.type)
}

export function readTriggerContextSpaceId(trigger: AutomationTrigger): string | null {
  if (!isTaskShapedAutomationTrigger(trigger)) return null
  const raw = (trigger as { context_space_id?: string }).context_space_id
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export function resolveTriggerContextSpaceId(input: {
  trigger: AutomationTrigger
  flowSpaceId: string
  flowSpaceIsConceptSandbox: boolean
}): string | null {
  const explicit = readTriggerContextSpaceId(input.trigger)
  if (explicit) return explicit
  if (input.flowSpaceIsConceptSandbox) return null
  return input.flowSpaceId
}

export function triggerContextSpaceSetupRequired(input: {
  trigger: AutomationTrigger
  flowSpaceIsConceptSandbox: boolean
}): boolean {
  if (!isTaskShapedAutomationTrigger(input.trigger)) return false
  if (!input.flowSpaceIsConceptSandbox) return false
  return !readTriggerContextSpaceId(input.trigger)
}

export function clearTaskTriggerSchemaBoundFields(trigger: AutomationTrigger): AutomationTrigger {
  switch (trigger.type) {
    case 'status_change':
      return { ...trigger, from: undefined, to: '' }
    case 'task_created':
      return { ...trigger, in_status: undefined }
    case 'field_changed':
      return { ...trigger, field_id: '', to: undefined }
    case 'tag_added':
    case 'tag_removed':
      return { ...trigger, tag: undefined }
    default:
      return trigger
  }
}

export function applyTriggerContextSpaceId(
  trigger: AutomationTrigger,
  spaceId: string,
): AutomationTrigger {
  if (!isTaskShapedAutomationTrigger(trigger)) return trigger
  const current = readTriggerContextSpaceId(trigger)
  if (current === spaceId) return trigger
  return {
    ...clearTaskTriggerSchemaBoundFields(trigger),
    context_space_id: spaceId,
  } as AutomationTrigger
}

export function flowFieldsForTriggerContext(input: {
  trigger: AutomationTrigger
  flowSpaceId: string
  flowSpaceIsConceptSandbox: boolean
  spaces: FlowTriggerContextSpace[]
  fallbackFields: ReturnType<typeof flowAutomationFieldsForSpace>
}): ReturnType<typeof flowAutomationFieldsForSpace> {
  const contextSpaceId = resolveTriggerContextSpaceId({
    trigger: input.trigger,
    flowSpaceId: input.flowSpaceId,
    flowSpaceIsConceptSandbox: input.flowSpaceIsConceptSandbox,
  })
  if (!contextSpaceId) return input.fallbackFields
  const space = input.spaces.find((row) => row.id === contextSpaceId)
  if (!space?.schema) return input.fallbackFields
  return flowAutomationFieldsForSpace(space.schema)
}

export function inferTriggerObjectForSetup(trigger: AutomationTrigger): TriggerObjectKey | '' {
  if (trigger.type === 'choose_action') return ''
  return inferTriggerObject(trigger)
}
