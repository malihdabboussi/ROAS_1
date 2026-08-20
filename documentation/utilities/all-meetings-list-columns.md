# all-meetings-list-columns

Last Modified: 2026-08-20

Ensures All Meetings shows **Client / Campaign**, **Host**, and **Call status** on existing Meetings spaces. Priority and task Status stay as fields but are hidden on that view. Space is not a default All Meetings column.

## Usage

```ts
import { ensureAllMeetingsListColumns } from '@/lib/spaces'

const schema = ensureAllMeetingsListColumns(space.schema)
```

`normalizeSpaceSchema` applies this when a view id is `all-meetings`. Opening Meetings also persists the upgraded schema. Related calls reuse the same column ids through `AllMeetingsNativeList`.
