# Quick Missions Events

## Purpose

Provides the shared browser event contract used to open the Quick Missions picker from chat Create surfaces without importing the Spaces playbook modal into shared shell and composer code.

## Contract

- `QUICK_MISSIONS_OPEN_EVENT` is the canonical event name.
- `dispatchOpenQuickMissions(playbookKey?)` opens the picker and can optionally preselect a playbook.
- `QuickMissionsHubHost` owns the event listener and renders the picker.

## Files

- `apps/web/src/lib/missions/quick-missions-events.ts`
- `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`

Last Modified: August 13, 2026
