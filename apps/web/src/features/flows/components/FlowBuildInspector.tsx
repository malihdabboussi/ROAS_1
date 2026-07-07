'use client'

import { useMemo } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  History,
  ListChecks,
  Workflow,
  XCircle,
} from 'lucide-react'
import type {
  FlowBuildPlanStatus,
  FlowBuildPlanStep,
  FlowBuildSessionSummary,
} from '@vibey/api-shared/types/flow-builder'
import { isFlowBuildPlanIntentOverloaded, planMissingStructuredSteps } from '@/lib/flows/flow-build-plan-intent.utils'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  FLOW_BUILD_PLAN_UI,
  FLOW_VALIDATION_UI,
  buildFlowValidationLoopPrompt,
  formatFlowValidationError,
} from '../config/errors.config'
import { FlowBuildPlanIntent } from './FlowBuildPlanIntent'

interface FlowBuildInspectorProps {
  summary: FlowBuildSessionSummary | null
  loading?: boolean
  onOpenDraft: (automationId: string) => void
  onAskLoopToFix?: (prompt: string) => void
}

const PLAN_STATUS_DOT_CLASS: Record<FlowBuildPlanStatus, string> = {
  planned: 'indicator-dot-glass-sm indicator-dot-glass-muted',
  validated: 'indicator-dot-glass-sm indicator-dot-glass-blue',
  compiled: 'indicator-dot-glass-sm indicator-dot-glass-green',
  blocked: 'indicator-dot-glass-sm indicator-dot-glass-red',
}

const PLAN_STATUS_LABELS: Record<FlowBuildPlanStatus, string> = {
  planned: 'Planned',
  validated: 'Validated',
  compiled: 'Compiled',
  blocked: 'Blocked',
}

const NEXT_ACTION_BADGE_CLASS: Record<
  FlowBuildSessionSummary['required_next_action'],
  string
> = {
  draft_flow_plan: 'badge-glass-muted',
  answer_clarification: 'badge-glass-orange',
  validate_flow_plan: 'badge-glass-blue',
  update_flow_plan_or_clarify: 'badge-glass-orange',
  compile_flow_plan: 'badge-glass-blue',
  evaluate_flow_plan: 'badge-glass-blue',
  ready_for_user_review: 'badge-glass-green',
  blocked: 'badge-glass-red',
}

const NEXT_ACTION_LABELS: Record<FlowBuildSessionSummary['required_next_action'], string> = {
  draft_flow_plan: 'Waiting for Loop',
  answer_clarification: 'Answer clarification',
  validate_flow_plan: 'Validate plan',
  update_flow_plan_or_clarify: 'Fix plan',
  compile_flow_plan: 'Compile draft',
  evaluate_flow_plan: 'Evaluate build',
  ready_for_user_review: 'Ready for review',
  blocked: 'Blocked',
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function FlowBuildInspector({
  summary,
  loading,
  onOpenDraft,
  onAskLoopToFix,
}: FlowBuildInspectorProps) {
  if (!summary) {
    if (loading) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <VibeyLoadingOrb text="Loading build plan..." state="processing" size="md" />
        </div>
      )
    }
    return null
  }

  const { plan, evaluation } = summary
  const friendlyValidationErrors = useMemo(
    () => (plan?.validation_errors ?? []).map((error) => formatFlowValidationError(error)),
    [plan?.validation_errors],
  )
  const steps = useMemo(
    () =>
      plan
        ? [plan.trigger, ...plan.actions].filter((step): step is FlowBuildPlanStep => !!step)
        : [],
    [plan],
  )
  if (!plan) {
    const sessionLabel =
      optionalString(summary.session?.plan_name)?.trim() ||
      optionalString(summary.session?.intent)?.trim() ||
      'Building automation plan'
    const statusLabel = summary.session?.status?.replace(/_/g, ' ') ?? 'in progress'
    return (
      <div className="gap-spacing-3 p-spacing-6 flex min-h-0 flex-1 flex-col items-center justify-center">
        <VibeyLoadingOrb text="Loop is drafting your flow..." state="processing" size="md" />
        <div className="text-center">
          <p className="body-2 text-foreground font-medium">{sessionLabel}</p>
          <p className="body-4 text-muted-foreground mt-spacing-1 capitalize">{statusLabel}</p>
        </div>
      </div>
    )
  }

  const showIntentStructureNotice =
    planMissingStructuredSteps(plan) && isFlowBuildPlanIntentOverloaded(plan.intent)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border px-spacing-4 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-between border-b">
        <div className="gap-spacing-2 flex min-w-0 items-center">
          <Workflow className="icon-md text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h2 className="body-2 text-foreground font-semibold">Loop build state</h2>
            <p className="body-4 text-muted-foreground truncate">{plan.name}</p>
          </div>
        </div>
        <div className="gap-spacing-2 flex shrink-0 items-center">
          {loading ? <VibeyLoadingOrb size="sm" state="processing" /> : null}
          {plan.automation_id ? (
            <button
              type="button"
              className="button-compact button-glass-primary"
              onClick={() => onOpenDraft(plan.automation_id!)}
            >
              Open draft
              <ArrowRight className="icon-sm" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-spacing-4 min-h-0 flex-1 overflow-y-auto">
        <div className="gap-spacing-4 flex min-w-0 flex-col">
          <section className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 flex flex-col">
            <div className="gap-spacing-2 flex items-start justify-between">
              <div className="gap-spacing-2 flex items-center">
                <ClipboardCheck className="icon-sm text-muted-foreground" />
                <h3 className="body-2 text-foreground font-semibold">Plan</h3>
              </div>
              <PlanHeaderMeta
                status={plan.status}
                stepCount={steps.length}
                traceCount={plan.trace_events.length}
                nextAction={summary.required_next_action}
              />
            </div>
            <FlowBuildPlanIntent intent={plan.intent} />
            {showIntentStructureNotice ? (
              <p className="body-4 text-warning">{FLOW_BUILD_PLAN_UI.INTENT_STRUCTURE_NOTICE}</p>
            ) : null}
          </section>

          <section className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 flex flex-col">
            <div className="gap-spacing-2 flex items-center">
              <ListChecks className="icon-sm text-muted-foreground" />
              <h3 className="body-2 text-foreground font-semibold">Steps</h3>
            </div>
            <div className="gap-spacing-2 flex flex-col">
              {steps.length > 0 ? (
                steps.map((step, index) => <StepRow key={step.id} step={step} index={index} />)
              ) : (
                <p className="body-3 text-muted-foreground">
                  Loop has not drafted trigger/action steps for this build yet.
                </p>
              )}
            </div>
          </section>

          {plan.validation_errors.length > 0 ? (
            <section className="border-destructive bg-destructive/10 rounded-spacing-3 p-spacing-4 border">
              <div className="gap-spacing-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="gap-spacing-2 flex items-center">
                    <XCircle className="icon-sm text-destructive shrink-0" />
                    <h3 className="body-2 text-foreground font-semibold">
                      {FLOW_VALIDATION_UI.BANNER_INVALID}
                    </h3>
                  </div>
                  <ul className="list-card-compact body-3 text-muted-foreground mt-spacing-2">
                    {friendlyValidationErrors.map((error) => (
                      <li key={error.technicalMessage}>
                        {formatBulletedListText(error.userMessage)}
                      </li>
                    ))}
                  </ul>
                </div>
                {onAskLoopToFix ? (
                  <button
                    type="button"
                    className="button-default button-glass-neutral shrink-0"
                    onClick={() =>
                      onAskLoopToFix(
                        buildFlowValidationLoopPrompt({
                          flowName: plan.name,
                          flowId: plan.automation_id ?? String(summary.session.id ?? 'build'),
                          errors: plan.validation_errors,
                        }),
                      )
                    }
                  >
                    {FLOW_VALIDATION_UI.ASK_LOOP}
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {evaluation ? (
            <section className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 flex flex-col">
              <div className="gap-spacing-2 flex items-start justify-between">
                <div className="gap-spacing-2 flex items-center">
                  <CheckCircle2 className="icon-sm text-success" />
                  <h3 className="body-2 text-foreground font-semibold">Evaluation</h3>
                </div>
                <p className="body-4 shrink-0">
                  <span className="text-muted-foreground">Score:</span>{' '}
                  <span className="text-foreground">
                    {evaluation.rank} · {evaluation.score}
                  </span>
                </p>
              </div>
              <EvaluationList title="Strengths" items={evaluation.strengths} />
              <EvaluationList title="Risks" items={evaluation.risks} />
            </section>
          ) : null}

          {summary.required_next_action === 'blocked' ? (
            <section className="border-warning bg-warning/10 rounded-spacing-3 p-spacing-4 gap-spacing-2 flex flex-col border">
              <div className="gap-spacing-2 flex items-center">
                <CircleAlert className="icon-sm text-warning" />
                <h3 className="body-2 text-foreground font-semibold">Blocked</h3>
              </div>
              <p className="body-3 text-muted-foreground">
                Loop marked this build as blocked. Check the latest trace or validation message
                before continuing.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PlanHeaderMeta({
  status,
  stepCount,
  traceCount,
  nextAction,
}: {
  status: FlowBuildPlanStatus
  stepCount: number
  traceCount: number
  nextAction: FlowBuildSessionSummary['required_next_action']
}) {
  const stepLabel = stepCount === 1 ? '1 step' : `${stepCount} steps`
  const traceLabel = traceCount === 1 ? '1 trace' : `${traceCount} traces`
  const nextActionLabel = NEXT_ACTION_LABELS[nextAction]

  return (
    <div className="gap-spacing-3 flex shrink-0 items-center">
      <PlanMetric count={stepCount} icon={ListChecks} tooltip={stepLabel} />
      <PlanMetric count={traceCount} icon={History} tooltip={traceLabel} />
      <Tooltip label={PLAN_STATUS_LABELS[status]} side="top">
        <span
          className={`${PLAN_STATUS_DOT_CLASS[status]} shrink-0`}
          aria-label={PLAN_STATUS_LABELS[status]}
        />
      </Tooltip>
      <Tooltip label={`Next: ${nextActionLabel}`} side="top">
        <span
          className={`badge-glass rounded-spacing-2 body-4 max-w-artifact-compact truncate ${NEXT_ACTION_BADGE_CLASS[nextAction]}`}
        >
          {nextActionLabel}
        </span>
      </Tooltip>
    </div>
  )
}

function PlanMetric({
  count,
  icon: Icon,
  tooltip,
}: {
  count: number
  icon: typeof ListChecks
  tooltip: string
}) {
  return (
    <Tooltip label={tooltip} side="top">
      <span className="gap-spacing-1 body-4 text-muted-foreground inline-flex items-center">
        <Icon className="icon-xs shrink-0" />
        <span className="text-foreground">{count}</span>
      </span>
    </Tooltip>
  )
}

function StepRow({ step, index }: { step: FlowBuildPlanStep; index: number }) {
  return (
    <div className="border-border rounded-spacing-3 p-spacing-3 gap-spacing-3 flex items-start border">
      <div className="text-muted-foreground body-4 h-spacing-7 w-spacing-7 flex shrink-0 items-center justify-center font-medium">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="gap-spacing-2 flex min-w-0 flex-wrap items-center">
          <p className="body-3 text-foreground font-medium">{step.title}</p>
        </div>
        <p className="body-4 text-muted-foreground mt-spacing-1">{step.description}</p>
        {step.missing_fields.length > 0 ? (
          <p className="body-4 text-warning mt-spacing-2">
            Missing: {step.missing_fields.join(', ')}
          </p>
        ) : null}
        {step.compatibility_warnings.length > 0 ? (
          <p className="body-4 text-destructive mt-spacing-2">
            {step.compatibility_warnings.join(', ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function formatBulletedListText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function EvaluationList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="body-4 text-muted-foreground mb-spacing-1 font-medium">{title}</p>
      <ul className="list-card-compact body-3 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{formatBulletedListText(item)}</li>
        ))}
      </ul>
    </div>
  )
}
