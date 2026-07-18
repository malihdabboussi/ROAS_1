# Space work dock (collapse / tabs) — plan

Last updated: 2026-07-17  
Status: **Implemented (Phase A + B)**

## Shipped

- Persisted Space work tabs (`spaceWorkBySpaceId` in `useShellStore`) for docs + tasks
- `SpaceWorkDock` + `SpaceWorkTabStrip` beside chat on `/spaces`
- Collapse hides dock; Space stays mounted; expand restores last active tab via `?item=`
- Empty tip when no tabs yet
- Artifact viewer + List panel left alone

## Not in this ship (Phase C)

- Workspace file tree / “Open file” picker
- Pin/reorder tabs
- Opening chat attachments into Space tabs (still uses artifact viewer)
