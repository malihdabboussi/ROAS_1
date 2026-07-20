# Space work dock (collapse) — plan

Last updated: 2026-07-19  
Status: **Tabs removed; dock + collapse remain**

## Shipped

- `SpaceWorkDock` beside chat on `/spaces` (body only — no open-item tab strip)
- Collapse hides dock; Space stays mounted so selection survives expand
- Artifact viewer + List panel left alone

## Removed

- Persisted Space work tabs (`spaceWorkBySpaceId`)
- `SpaceWorkTabStrip` / `space-work-tabs` / `use-space-work-tab-sync`
- Empty “open a doc or task” tip driven by tab count

## Not in this ship

- Workspace file tree / “Open file” picker
- Opening chat attachments into Space (still uses artifact viewer)
