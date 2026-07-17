'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Download, GitBranch, RefreshCw, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { formatWebinarSubtaskTitle } from '@/lib/missions'
import type {
  MissionHarnessAssertion,
  MissionHarnessSpec,
  MissionStatus,
  MissionSubtask,
  PrdContent,
  RecommendedHire,
} from '../../types'
import { MISSION_DETAIL_ERRORS } from '../../types'
import { resolveSubtaskOutputDisplay } from './subtask-detail'

type ModalPlanContent = PrdContent & {
  approach?: string
  steps?: Array<{ id: string; title: string; status: string; notes?: string }>
}

interface PlanDetailModalProps {
  planContent: PrdContent | null
  subtasks: MissionSubtask[]
  onClose: () => void
  missionStatus?: MissionStatus
  recommendedHires?: RecommendedHire[]
  onApprove?: () => void
  onReject?: () => void
  approving?: boolean
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function compactText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getAssertionKey(assertion: MissionHarnessAssertion): string {
  return compactText(assertion.assertionKey) || 'A-?'
}

function hasHarnessContent(harness: MissionHarnessSpec | null | undefined): boolean {
  if (!harness) return false
  return Boolean(
    compactText(harness.contextSnapshot?.summary) ||
    (harness.contextSnapshot?.campaignFacts?.length ?? 0) > 0 ||
    (harness.contextSnapshot?.customerFacts?.length ?? 0) > 0 ||
    (harness.contextSnapshot?.avatarFacts?.length ?? 0) > 0 ||
    (harness.contextSnapshot?.productFacts?.length ?? 0) > 0 ||
    (harness.assumptions?.length ?? 0) > 0 ||
    (harness.assertions?.length ?? 0) > 0 ||
    (harness.assertionCoverage?.length ?? 0) > 0 ||
    (harness.validatorPlan?.length ?? 0) > 0,
  )
}

function renderFactList(title: string, facts: string[] | undefined) {
  if (!facts || facts.length === 0) return null
  return (
    <div>
      <h5 className="body-3 text-muted-foreground mb-spacing-1 font-medium uppercase tracking-wide">
        {title}
      </h5>
      <ul className="space-y-spacing-1 pl-spacing-5 list-disc">
        {facts.map((fact, i) => (
          <li key={i} className="body-3 text-muted-foreground">
            {fact}
          </li>
        ))}
      </ul>
    </div>
  )
}

function renderHarnessPdfHtml(
  content: ModalPlanContent | null,
  subtasks: MissionSubtask[],
): string {
  const harness = content?.harness
  if (!hasHarnessContent(harness)) return ''
  const snapshot = harness?.contextSnapshot
  const subtaskTitleById = new Map(subtasks.map((st) => [st.id, st.title]))
  return `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Mission harness</h3>
      ${
        snapshot?.summary
          ? `<p style="margin: 0 0 12px;">${escapeHtml(snapshot.summary).replace(/\n/g, '<br>')}</p>`
          : ''
      }
      ${
        harness?.assumptions && harness.assumptions.length > 0
          ? `
        <h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 4px;">Assumptions</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${harness.assumptions
            .map((assumption) => `<li>${escapeHtml(compactText(assumption.statement))}</li>`)
            .join('')}
        </ul>
      `
          : ''
      }
      ${
        harness?.assertions && harness.assertions.length > 0
          ? `
        <h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 4px;">Assertions</h4>
        ${harness.assertions
          .map((assertion) => {
            const key = getAssertionKey(assertion)
            const statement = compactText(assertion.statement)
            const evidence = compactText(assertion.evidenceRequirement)
            return `<p style="margin: 0 0 8px;"><strong>${escapeHtml(key)}</strong> ${escapeHtml(statement)}${evidence ? `<br><span style="color:#444;">Evidence: ${escapeHtml(evidence)}</span>` : ''}</p>`
          })
          .join('')}
      `
          : ''
      }
      ${
        harness?.assertionCoverage && harness.assertionCoverage.length > 0
          ? `
        <h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 4px;">Coverage</h4>
        ${harness.assertionCoverage
          .map((row) => {
            const implementedBy = (row.implementedBy ?? [])
              .map((id) => subtaskTitleById.get(id) ?? id)
              .join(', ')
            return `<p style="margin: 0 0 6px;"><strong>${escapeHtml(compactText(row.assertionKey))}</strong> ${escapeHtml(implementedBy)}</p>`
          })
          .join('')}
      `
          : ''
      }
    </div>
  `
}

function SubtaskSection({
  title,
  variant = 'default',
  children,
}: {
  title: string
  variant?: 'default' | 'feedback'
  children: ReactNode
}) {
  return (
    <div>
      <p
        className={`typo-caption mb-spacing-2 font-semibold uppercase tracking-wide ${
          variant === 'feedback' ? 'text-warning' : 'text-muted-foreground'
        }`}
      >
        {title}
      </p>
      <div className="pl-0">{children}</div>
    </div>
  )
}

function renderIntentBody(subtask: MissionSubtask) {
  const intent = subtask.intent
  if (!intent?.why) {
    return <p className="body-3 text-muted-foreground py-spacing-1">No plan details yet.</p>
  }
  const rows = [
    ['Why', intent.why],
    ['Story', intent.story],
    ['Sensory', intent.sensory],
    ['End-State', intent.endState],
    ['Ecology', intent.ecology],
  ].filter((r): r is [string, string] => Boolean(String(r[1] ?? '').trim()))

  return (
    <div className="flex flex-col">
      {rows.map(([label, value], i) => (
        <div key={label} className={i > 0 ? 'mt-spacing-4' : ''}>
          <p className="typo-caption mb-spacing-1 text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="body-3 text-foreground leading-relaxed">{value}</p>
        </div>
      ))}
    </div>
  )
}

function renderAgentNotesBody(subtask: MissionSubtask) {
  const display = resolveSubtaskOutputDisplay(subtask.output)
  if (!display) {
    return <p className="body-3 text-muted-foreground py-spacing-1">No agent notes yet.</p>
  }
  return (
    <div className="bg-muted/15 rounded-spacing-2 px-spacing-3 py-spacing-2 max-h-[min(42vh,22rem)] overflow-y-auto">
      <MarkdownRenderer className="body-3 text-muted-foreground max-w-none leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {display.body}
      </MarkdownRenderer>
    </div>
  )
}

function renderFeedbackBody(subtask: MissionSubtask) {
  if (!subtask.feedback) {
    return <p className="body-3 text-muted-foreground py-spacing-1">No feedback yet.</p>
  }
  return (
    <p className="body-3 bg-warning/10 text-warning rounded-spacing-2 px-spacing-3 py-spacing-2 leading-relaxed">
      {subtask.feedback}
    </p>
  )
}

export function PlanDetailModal({
  planContent,
  subtasks,
  onClose,
  missionStatus,
  recommendedHires,
  onApprove,
  onReject,
  approving,
}: PlanDetailModalProps) {
  const isPendingApproval = missionStatus === 'pending_approval'
  const hasHires = (recommendedHires?.length ?? 0) > 0
  const [downloading, setDownloading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const sortedSubtasks = useMemo(
    () => [...subtasks].sort((a, b) => a.sort_order - b.sort_order),
    [subtasks],
  )
  const subtaskTitleById = useMemo(
    () => new Map(sortedSubtasks.map((subtask) => [subtask.id, subtask.title])),
    [sortedSubtasks],
  )

  const toggleSubtask = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const content = planContent as ModalPlanContent | null
  const harness = content?.harness
  const showHarness = hasHarnessContent(harness)
  const assertionByKey = useMemo(() => {
    const map = new Map<string, MissionHarnessAssertion>()
    for (const assertion of harness?.assertions ?? []) {
      map.set(getAssertionKey(assertion), assertion)
    }
    return map
  }, [harness?.assertions])

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true)
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default

      const planHtml =
        content != null
          ? `
          ${
            content.summary
              ? `
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Summary</h3>
              <p style="margin: 0;">${escapeHtml(content.summary).replace(/\n/g, '<br>')}</p>
            </div>
          `
              : ''
          }

          ${
            content.overview
              ? `
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Overview</h3>
              <p style="margin: 0;">${escapeHtml(content.overview).replace(/\n/g, '<br>')}</p>
            </div>
          `
              : ''
          }

          ${
            content.approach
              ? `
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Approach</h3>
              <p style="margin: 0; font-style: italic;">${escapeHtml(content.approach).replace(/\n/g, '<br>')}</p>
            </div>
          `
              : ''
          }

          ${
            content.steps && content.steps.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Steps</h3>
              ${content.steps
                .map(
                  (step) => `
                <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                  <div style="position: absolute; left: 0; top: 8px; width: 6px; height: 6px; border-radius: 50%; background: #000;"></div>
                  <strong style="display: block; margin-bottom: 4px;">${escapeHtml(step.title)}</strong>
                  ${step.notes ? `<p style="margin: 0; color: #444;">${escapeHtml(step.notes).replace(/\n/g, '<br>')}</p>` : ''}
                </div>
              `,
                )
                .join('')}
            </div>
          `
              : ''
          }

          ${
            content.sections && content.sections.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Sections</h3>
              ${content.sections
                .map(
                  (section) => `
                <div style="margin-bottom: 16px;">
                  <h4 style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${escapeHtml(section.heading)}</h4>
                  <p style="margin: 0;">${escapeHtml(section.body).replace(/\n/g, '<br>')}</p>
                </div>
              `,
                )
                .join('')}
            </div>
          `
              : ''
          }

          ${renderHarnessPdfHtml(content, sortedSubtasks)}

          ${
            content.outOfScope && content.outOfScope.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Out of scope</h3>
              <ul style="margin: 0; padding-left: 20px;">
                ${content.outOfScope
                  .map(
                    (item) => `
                  <li style="margin-bottom: 4px;">${escapeHtml(item)}</li>
                `,
                  )
                  .join('')}
              </ul>
            </div>
          `
              : ''
          }
        `
          : ''

      const subtasksHtml =
        sortedSubtasks.length > 0
          ? `
        <div style="margin-top: 28px; margin-bottom: 20px;">
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Subtasks</h2>
          ${sortedSubtasks
            .map((st) => {
              const intent = st.intent
              const planBits =
                intent?.why ||
                intent?.story ||
                intent?.sensory ||
                intent?.endState ||
                intent?.ecology
                  ? [
                      intent?.why ? `<p><strong>Why:</strong> ${escapeHtml(intent.why)}</p>` : '',
                      intent?.story
                        ? `<p><strong>Story:</strong> ${escapeHtml(intent.story)}</p>`
                        : '',
                      intent?.sensory
                        ? `<p><strong>Sensory:</strong> ${escapeHtml(intent.sensory)}</p>`
                        : '',
                      intent?.endState
                        ? `<p><strong>End-State:</strong> ${escapeHtml(intent.endState)}</p>`
                        : '',
                      intent?.ecology
                        ? `<p><strong>Ecology:</strong> ${escapeHtml(intent.ecology)}</p>`
                        : '',
                    ]
                      .filter(Boolean)
                      .join('')
                  : '<p style="color:#666;">No plan details yet.</p>'

              let notes = '<p style="color:#666;">No agent notes yet.</p>'
              if (st.output && Object.keys(st.output).length > 0) {
                if (typeof st.output.content === 'string') {
                  notes = `<div style="white-space: pre-wrap;">${escapeHtml(st.output.content)}</div>`
                } else {
                  notes = `<pre style="white-space: pre-wrap; font-size: 12px;">${escapeHtml(JSON.stringify(st.output, null, 2))}</pre>`
                }
              }

              const fb = st.feedback
                ? `<p style="color:#b45309;">${escapeHtml(st.feedback).replace(/\n/g, '<br>')}</p>`
                : '<p style="color:#666;">No feedback yet.</p>'

              return `
            <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #ddd;">
              <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">${escapeHtml(st.title)}</h3>
              <h4 style="font-size: 14px; font-weight: 600; margin: 8px 0 4px;">Plan</h4>
              ${planBits}
              <h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 4px;">Agent notes</h4>
              ${notes}
              <h4 style="font-size: 14px; font-weight: 600; margin: 12px 0 4px;">Feedback</h4>
              ${fb}
            </div>
          `
            })
            .join('')}
        </div>
      `
          : ''

      const element = document.createElement('div')
      element.innerHTML = `
        <div style="padding: 40px; font-family: sans-serif; color: black; background: white; width: 800px; font-size: 14px; line-height: 1.6;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase;">Task overview</h1>
          <p style="margin: 0 0 24px; color: #444; font-size: 13px;">Execution plan, subtask plans, agent notes, and feedback in one place.</p>
          ${
            content != null
              ? `
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">Execution plan</h2>
          ${planHtml}
          `
              : ''
          }
          ${subtasksHtml}
        </div>
      `

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: 'task-overview.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }

      await (html2pdf() as any).set(opt).from(element).save()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : MISSION_DETAIL_ERRORS.DOWNLOAD_PDF_FAILED.userMessage,
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="z-modal-backdrop" onClick={onClose} role="presentation" />
      <div className="z-modal-content p-spacing-4 pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="surface-card card-elevated rounded-spacing-4 pointer-events-auto relative flex h-[90vh] w-full max-w-[800px] flex-col overflow-hidden shadow-2xl">
          <div className="px-spacing-4 py-spacing-3 flex flex-shrink-0 items-center justify-between">
            <div className="pr-spacing-2 min-w-0">
              <h2 className="title-h6 text-foreground uppercase">Task overview</h2>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Execution plan → subtasks (plan, agent notes, feedback)
              </p>
            </div>
            <div className="gap-spacing-2 flex shrink-0 items-center">
              {isPendingApproval && onReject && (
                <button
                  type="button"
                  onClick={onReject}
                  className="button-glass-neutral body-3 rounded-lg px-3 py-1.5"
                >
                  Reject
                </button>
              )}
              {isPendingApproval && onApprove && (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={approving}
                  className="chip-glass-green body-3 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50"
                >
                  {approving ? (
                    <RefreshCw className="icon-sm animate-spin" />
                  ) : (
                    <>
                      <Check className="icon-sm mr-1 inline-block" />
                      {hasHires ? 'Approve & Hire' : 'Approve'}
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="btn-icon-glass disabled:opacity-50"
                title="Download PDF"
              >
                {downloading ? (
                  <RefreshCw className="icon-sm animate-spin" />
                ) : (
                  <Download className="icon-sm" />
                )}
              </button>
              <button type="button" onClick={onClose} className="btn-icon-bare">
                <X className="icon-sm" />
              </button>
            </div>
          </div>
          <div className="px-spacing-4 pb-spacing-4 pt-spacing-4 min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-spacing-6">
              {content != null && (
                <section>
                  <p className="typo-caption text-muted-foreground mb-spacing-3 font-medium uppercase tracking-wider">
                    Execution plan
                  </p>
                  <div className="space-y-spacing-4">
                    {content.summary && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Summary
                        </h4>
                        <p className="body-2 text-foreground">{content.summary}</p>
                      </div>
                    )}
                    {content.overview && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Overview
                        </h4>
                        <p className="body-2 text-foreground">{content.overview}</p>
                      </div>
                    )}
                    {content.approach && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Approach
                        </h4>
                        <p className="body-2 text-muted-foreground italic">{content.approach}</p>
                      </div>
                    )}
                    {content.steps && content.steps.length > 0 && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Steps
                        </h4>
                        <div className="space-y-spacing-2">
                          {content.steps.map((step) => (
                            <div key={step.id}>
                              <span className="body-2 text-foreground">{step.title}</span>
                              {step.notes && (
                                <p className="body-3 text-muted-foreground mt-spacing-1">
                                  {step.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {content.sections && content.sections.length > 0 && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Sections
                        </h4>
                        <div className="space-y-spacing-3">
                          {content.sections.map((section, i) => (
                            <div key={i}>
                              <h5 className="body-2 text-foreground font-medium">
                                {section.heading}
                              </h5>
                              <p className="body-2 text-muted-foreground mt-spacing-1">
                                {section.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {content.outOfScope && content.outOfScope.length > 0 && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Out of scope
                        </h4>
                        <ul className="space-y-spacing-1 pl-spacing-5 list-disc">
                          {content.outOfScope.map((item, i) => (
                            <li key={i} className="body-2 text-muted-foreground">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {showHarness && (
                <section>
                  <p className="typo-caption text-muted-foreground mb-spacing-3 font-medium uppercase tracking-wider">
                    Mission harness
                  </p>
                  <div className="space-y-spacing-4">
                    {harness?.contextSnapshot && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Context snapshot
                        </h4>
                        {harness.contextSnapshot.summary && (
                          <p className="body-2 text-foreground mb-spacing-3">
                            {harness.contextSnapshot.summary}
                          </p>
                        )}
                        <div className="gap-spacing-3 flex flex-col">
                          {renderFactList('Campaign', harness.contextSnapshot.campaignFacts)}
                          {renderFactList('Customer', harness.contextSnapshot.customerFacts)}
                          {renderFactList('Avatar', harness.contextSnapshot.avatarFacts)}
                          {renderFactList('Product', harness.contextSnapshot.productFacts)}
                        </div>
                      </div>
                    )}

                    {harness?.assumptions && harness.assumptions.length > 0 && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Assumptions
                        </h4>
                        <div className="gap-spacing-2 flex flex-col">
                          {harness.assumptions.map((assumption, i) => (
                            <div
                              key={assumption.id || i}
                              className="bg-muted/15 rounded-spacing-2 px-spacing-3 py-spacing-2"
                            >
                              <p className="body-3 text-foreground">
                                {assumption.statement || 'Assumption'}
                              </p>
                              {assumption.risk && (
                                <p className="body-3 text-muted-foreground mt-spacing-1">
                                  Risk: {assumption.risk}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {harness?.assertions && harness.assertions.length > 0 && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Assertions
                        </h4>
                        <div className="gap-spacing-2 flex flex-col">
                          {harness.assertions.map((assertion, i) => (
                            <div
                              key={getAssertionKey(assertion) || i}
                              className="card-glass rounded-spacing-3 px-spacing-4 py-spacing-3"
                            >
                              <div className="gap-spacing-2 flex items-center">
                                <span className="body-3 text-foreground font-medium">
                                  {getAssertionKey(assertion)}
                                </span>
                                <span className="body-3 text-muted-foreground">
                                  {assertion.priority || 'must'} / {assertion.category || 'general'}
                                </span>
                              </div>
                              {assertion.statement && (
                                <p className="body-2 text-foreground mt-spacing-1">
                                  {assertion.statement}
                                </p>
                              )}
                              {assertion.evidenceRequirement && (
                                <p className="body-3 text-muted-foreground mt-spacing-1">
                                  Evidence: {assertion.evidenceRequirement}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {harness?.assertionCoverage && harness.assertionCoverage.length > 0 && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Coverage
                        </h4>
                        <div className="gap-spacing-2 flex flex-col">
                          {harness.assertionCoverage.map((row, i) => (
                            <div
                              key={`${row.assertionKey || 'assertion'}-${i}`}
                              className="bg-muted/15 rounded-spacing-2 px-spacing-3 py-spacing-2"
                            >
                              <p className="body-3 text-foreground font-medium">
                                {row.assertionKey || 'Assertion'}
                              </p>
                              {(row.implementedBy?.length ?? 0) > 0 && (
                                <p className="body-3 text-muted-foreground mt-spacing-1">
                                  Implemented by:{' '}
                                  {row
                                    .implementedBy!.map((id) => subtaskTitleById.get(id) ?? id)
                                    .join(', ')}
                                </p>
                              )}
                              {(row.verifiedBy?.length ?? 0) > 0 && (
                                <p className="body-3 text-muted-foreground mt-spacing-1">
                                  Verified by: {row.verifiedBy!.join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {harness?.validatorPlan && harness.validatorPlan.length > 0 && (
                      <div>
                        <h4 className="body-2 text-muted-foreground mb-spacing-2 font-semibold">
                          Validator plan
                        </h4>
                        <div className="gap-spacing-2 flex flex-col">
                          {harness.validatorPlan.map((plan, i) => (
                            <div
                              key={`${plan.validator || 'validator'}-${i}`}
                              className="bg-muted/15 rounded-spacing-2 px-spacing-3 py-spacing-2"
                            >
                              <p className="body-3 text-foreground font-medium">
                                {plan.validator || 'Validator'}
                                {plan.scope ? `: ${plan.scope}` : ''}
                              </p>
                              {(plan.checks?.length ?? 0) > 0 && (
                                <ul className="space-y-spacing-1 pl-spacing-5 mt-spacing-1 list-disc">
                                  {plan.checks!.map((check, checkIndex) => (
                                    <li key={checkIndex} className="body-3 text-muted-foreground">
                                      {check}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {hasHires && isPendingApproval && (
                <section>
                  <p className="typo-caption text-warning mb-spacing-3 font-medium uppercase tracking-wider">
                    Recommended Hires
                  </p>
                  <div className="gap-spacing-2 flex flex-col">
                    {recommendedHires!.map((hire) => (
                      <div
                        key={hire.role_key}
                        className="card-glass rounded-spacing-3 px-spacing-4 py-spacing-3 flex items-center gap-3"
                      >
                        <div className="bg-warning/20 text-warning flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                          <UserPlus className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="body-2 text-foreground font-medium">{hire.role_key}</p>
                          {hire.reason && (
                            <p className="body-3 text-muted-foreground">{hire.reason}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {sortedSubtasks.length > 0 && (
                <section>
                  <p className="typo-caption text-muted-foreground mb-spacing-3 font-medium uppercase tracking-wider">
                    Subtasks
                  </p>
                  <div className="gap-spacing-3 flex flex-col">
                    {sortedSubtasks.map((subtask) => {
                      const isOpen = expanded.has(subtask.id)
                      const assertionKeys =
                        harness?.subtaskAssertionKeys?.[subtask.id] ?? subtask.assertionKeys ?? []
                      return (
                        <div
                          key={subtask.id}
                          className="card-glass rounded-spacing-3 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSubtask(subtask.id)}
                            className="body-2 hover:bg-background/10 gap-spacing-2 px-spacing-4 py-spacing-3 text-foreground flex w-full items-center text-left transition-colors"
                          >
                            <ChevronDown
                              className={`icon-sm text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            />
                            <GitBranch
                              className="icon-sm text-muted-foreground shrink-0"
                              aria-hidden
                            />
                            <span className="body-2 min-w-0 flex-1">
                              {formatWebinarSubtaskTitle(subtask.title)}
                            </span>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="px-spacing-4 pb-spacing-4 pt-spacing-1">
                                  <div className="gap-spacing-4 flex flex-col">
                                    <SubtaskSection title="Plan">
                                      {renderIntentBody(subtask)}
                                    </SubtaskSection>
                                    {assertionKeys.length > 0 && (
                                      <SubtaskSection title="Assertions">
                                        <div className="gap-spacing-2 flex flex-col">
                                          {assertionKeys.map((key) => {
                                            const assertion = assertionByKey.get(key)
                                            return (
                                              <div
                                                key={key}
                                                className="bg-muted/15 rounded-spacing-2 px-spacing-3 py-spacing-2"
                                              >
                                                <p className="body-3 text-foreground font-medium">
                                                  {key}
                                                </p>
                                                {assertion?.statement && (
                                                  <p className="body-3 text-muted-foreground mt-spacing-1">
                                                    {assertion.statement}
                                                  </p>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </SubtaskSection>
                                    )}
                                    <SubtaskSection title="Agent notes">
                                      {renderAgentNotesBody(subtask)}
                                    </SubtaskSection>
                                    <SubtaskSection title="Feedback" variant="feedback">
                                      {renderFeedbackBody(subtask)}
                                    </SubtaskSection>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
