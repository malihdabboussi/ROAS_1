# Chat working status

Last Modified: 2026-08-17

## Purpose

Shared Cursor-style working phrases for live chat status. A pinned brain or tool label is shown briefly, then the line types through rotating phrases so a long Brain lookup still looks alive.

## Public API

- `CHAT_WORKING_STATUS_PHRASES`
- `CHAT_WORKING_STATUS_HOLD_MS`
- `CHAT_WORKING_STATUS_CYCLE_MS`
- `resolveWorkingStatusLabel({ pinnedLabel, cycling, cycleIndex })`
- `useWorkingStatusLabel(pinnedLabel, active)`
- `ChatWorkingStatusLabel` and `TypewriterShimmer` in `@/components/chat`

## Consumers

- Home / Studio `StatusIndicator`
- Locked-in tool/thinking group headers
- Thinking transcript headers while a turn is active

## Decision

Phrases and timing live in `@/lib/chat` so Studio chat UI and shared tool chrome stay in lockstep. Do not freeze on `agentStatusMessage` or a Brain tool label for the whole turn.
