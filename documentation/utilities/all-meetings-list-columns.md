# all-meetings-list-columns

Last Modified: 2026-08-19

Ensures the All Meetings list always includes **Campaign** (`client_campaign`) and **Space** (`space_title`) columns, including on Meetings spaces created before those fields existed.

## Usage

```ts
import { ensureAllMeetingsListColumns } from '@/lib/spaces'

const schema = ensureAllMeetingsListColumns(space.schema)
```

`normalizeSpaceSchema` applies this when a view id is `all-meetings`. Related calls reuse the same column ids through `AllMeetingsNativeList`.
