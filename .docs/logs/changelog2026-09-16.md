# Changelog - [September 16, 2026]

## [2026-09-16 22:15] - [FEATURE]

What: Train Brain > Recurring gains a Read AI section. The rule is derived from the shared note-taker status endpoint (GET /api/integrations/meetings/read_ai/status), listed between Fireflies and Zoom, and rendered by a status-only card: Read AI pushes finished meetings through the shared door, so there is nothing to sync or schedule; when not connected the card points to Settings > Integrations.
Why: The Recurring tab listed Fathom, Fireflies and a Zoom placeholder but not Read AI, although Read AI is a connected note taker in the modular system (ROA-40). Users asked why it was missing.
Impact: Read AI appears on the Recurring tab with its connection state. No back-end change. Tests: recurring-rules.service.test.ts covers the rule derivation, ordering and the not-connected fallback.
Files: apps/web/src/features/brain/services/recurring-rules.service.ts, apps/web/src/features/brain/services/recurring-rules.service.test.ts (new), apps/web/src/features/brain/components/training/recurring/RecurringKindSection.tsx, apps/web/src/features/brain/components/training/recurring/RecurringRuleRow.tsx, apps/web/src/features/brain/components/training/recurring/rule-cards/ReadAiRuleCard.tsx (new)
