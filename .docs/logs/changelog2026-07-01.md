# Changelog - July 01, 2026

---

## [2026-07-01 15:56] - [FEATURE]

What: Flow space selectors now group spaces by campaign (General first, then A–Z, Other spaces last) with a searchable dropdown — task trigger Setup Space field, Loop composer scope picker, and flows breadcrumb/filter dropdowns.
Why: Flat space lists duplicated names across campaigns and were hard to scan; sidebar already grouped by campaign.
Impact: Task trigger configuration and flows navigation pickers show campaign sections, filter by campaign or space name, and dedupe ordering via shared `groupFlowSpacesByCampaign`.
Files: flow-space-picker.utils.ts, flow-space-picker.utils.test.ts, FlowCampaignGroupedSpaceSelect.tsx, FlowCampaignGroupedSpaceSelect.test.tsx, FlowBuilderStepSetupPanel.tsx, FlowComposerSpaceSelector.tsx, FlowComposerSpaceSelector.test.tsx, FlowsSpaceBreadcrumbDropdown.tsx, FlowsSpaceFilterBreadcrumbDropdown.tsx, flow-trigger-context-space.utils.ts, FlowsPage.tsx

---

## [2026-07-01 14:31] - [FIX]

What: Completed a flow builder validation pass: fixed warning token resolution, added Tailwind warning/success semantic colors, tightened task-context Configure behavior, and cleared flow-builder TypeScript issues found during testing.
Why: Warning icons rendered gray because `--color-warning` was undefined; task triggers without a selected context space could still reach Configure internals; focused tests needed to reflect warning-until-tested behavior.
Impact: Warning icons render yellow, task triggers use selected space context only, record/sample testing works for empty task spaces, and flow-specific typecheck errors are resolved.
Files: globals.css, tailwind.config.ts, FlowBuilderStepWizardNav.tsx, FlowBuilderStepPanel.tsx, FlowBuilderStepSetupPanel.tsx, FlowBuilderStudio.tsx, FlowConnectedAppConnectField.tsx, FlowBuildInspector.tsx, FlowBuildVisualPanel.tsx, FlowsEditorPanel.tsx, FlowsManageGridView.tsx, FlowsPage.tsx, sync-flow-plan-to-draft.ts, flow-builder-step-phase.utils.test.ts, flow-builder-canvas.utils.test.ts

---

## [2026-07-01 14:18] - [STYLE]

What: Flow canvas step cards — bare ⋮ menu (no glass box), type badge shifted left of menu, orange warning triangle for incomplete steps/phases.
Why: Menu container overlapped Space/Agent/Action badges; gray circle read as clock instead of needs-attention.
Impact: Cleaner step card trailing layout; warning state uses `text-warning` triangle on canvas and wizard nav.
Files: FlowBuilderCanvas.tsx, FlowBuilderStepWizardNav.tsx, globals.css

---

## [2026-07-01 14:15] - [FEATURE]

What: Flow step panel footer uses Back + Continue (always enabled), step actions menu (rename/delete/clone), yellow warning badges until tested, and Zapier-style Run test that loads recent space tasks.
Why: Remove was missing on trigger steps, Continue was blocked when setup incomplete, checkmarks appeared before testing, and test UX did not match expected sample-data flow.
Impact: Steps show warning until configured and tested; Back navigates wizard phases; ⋮ menu handles delete/clone; Run test pulls recent tasks then sample data with load-more.
Files: FlowBuilderStepPanel.tsx, FlowBuilderStepTestPanel.tsx, FlowBuilderCanvas.tsx, FlowBuilderStudio.tsx, FlowBuilderStepActionsMenu.tsx, FlowBuilderStepCloneDialog.tsx, flow-builder-step-phase.utils.ts, flow-builder-canvas.utils.ts, flow-builder-step-actions.utils.ts, globals.css

---

What: Flow step Test tab now searches tasks in the configured space, loads sample data, previews step output, and adds Continue to Step N after a successful test.
Why: Test UI had a disconnected play control, non-interactive sample data, and no way to advance to the next step with real task context.
Impact: Task triggers can pick a live sample task; action steps preview rendered prompts/comments from that task; Continue unlocks after Run test and jumps to the next canvas step.
Files: flow-builder-test.utils.ts, flow-automation-template-preview.ts, FlowBuilderStepTestPanel.tsx, FlowBuilderStepPanel.tsx, FlowBuilderStudio.tsx

---

## [2026-07-01 14:08] - [STYLE]

What: Moved the flow step footer Remove action to the left and Continue action to the right with primary green styling.
Why: The centered transparent Continue button made the right panel footer feel unbalanced and unclear.
Impact: Flow step setup/configure footer actions now match expected destructive-left and primary-right dialog hierarchy.
Files: apps/web/src/features/flows/components/flow-builder/FlowBuilderStepPanel.tsx

---

## [2026-07-01 10:30] - [FEATURE]

What: Added agency flow template "Strategic Research" from Marketing space workflow (Sefi).
Why: Make the research → strategy brief → sample content → Brain task pipeline installable from Agency flows browse.
Impact: Users can install Strategic Research preset; triggers when task moves to Research status.
Files: space-automation-template-catalog-agency.ts, 20260701120000_agency_strategic_research_template.sql, space-automation-template-catalog.test.ts

---

## [2026-07-01 14:05] - [FIX]

What: Template install now creates a Loop build session linking the new draft to the chat conversation.
Why: First open after installing a template showed "No loop" until refresh because no conversation↔flow session existed.
Impact: Installing a flow template shows "Open Loop" immediately; Loop chat is wired to the new draft on first load.
Files: apps/web/src/features/flows/containers/FlowsPage.tsx

---

## [2026-07-01 14:07] - [FEATURE]

What: Task trigger Setup now requires picking a target space in Create anything mode; Configure uses that space's task schema (statuses, fields).
Why: Setup showed a generic "Space" card with no selection, so status/status-change Configure had no real space context (especially in concept sandbox).
Impact: Task triggers gate Configure until a space is chosen; status pickers reflect the selected space; choice persists on trigger as `context_space_id`.
---

## [2026-07-01 14:45] - [STYLE]

What: Redesigned flow builder Test tab — centered compact Run test button (no play icon), record dropdown instead of task list + Sample data card, fallback sample record when space has no tasks.
Why: Run test was full-width with misaligned play icon; sample data was redundant with output; empty spaces blocked testing.
Impact: Run test matches app button style; users pick records from a dropdown; empty spaces get a preview sample record to continue testing.
Files: FlowBuilderStepTestPanel.tsx, flow-builder-test.utils.ts, flow-builder-test.utils.test.ts

---

What: Flow builder Test tab now loads tasks only from the trigger's selected context space; stale sample data clears when the space changes. Continue footer button uses `button-compact` so it matches the rounded Back button.
Why: Concept-sandbox flows fell back to the sandbox space id when no space was picked, and `button-medium` was undefined so Continue rendered with sharp corners.
Impact: Run test pulls tasks from the space chosen in Setup; switching spaces resets test samples; footer Continue is pill-shaped like Back.
Files: FlowBuilderStepPanel.tsx, FlowBuilderStepTestPanel.tsx, FlowBuilderStudio.tsx

---

## [2026-07-01 14:41] - [FEATURE]

What: Split flow builder Loop vs Branch controls — added `flow_branch` if-then step, fixed loop step numbering, cleaned redundant Loop labels, and made loop/branch target steps selectable with consistent canvas step numbers.
Why: The old “condition” category was labeled Loop three times, loop-back summary showed the wrong step (step 1 vs step 2), and there was no true if-then branch step.
Impact: Flow controls picker offers separate Branch and Loop steps; loop “on reject → step N” matches config; Branch routes by field condition with then/else step picks; backend executes branch jumps at runtime.
Files: flow-builder-step-types.utils.ts, flow-builder-canvas.utils.ts, FlowBuilderCanvas.tsx, ActionBuilder.tsx, automation-catalog.ts, space-schema.ts, flow-branch.utils.ts, space-automation-service-07/09.base.ts, flow-capabilities.ts, automation-flow-step-summary.utils.ts, flow-builder-step-index.utils.ts, DTOs, tests

---
