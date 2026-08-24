# all-meetings-list-columns

Last Modified: 2026-08-24

Ensures All Meetings shows **Client Workspace**, **Campaign Space**, **Host**, **Attendees**, and **Call status** on existing Meetings spaces. Those workspace columns use the same field ids and mapping as All Tasks (`campaign_name`, `space_title`). Priority and task Status stay as fields but are hidden on that view. Client / Campaign mapping stays as a field and is not a default column.

## Usage

```ts
import { ensureAllMeetingsListColumns } from '@/lib/spaces'

const schema = ensureAllMeetingsListColumns(space.schema)
```

`normalizeSpaceSchema` applies this when a view id is `all-meetings`. Opening Meetings also persists the upgraded schema. `withAttendeesColumn` inserts Attendees immediately after Host while preserving existing user order. Related calls reuse the same column ids through `AllMeetingsNativeList`. Call rows resolve Client Workspace / Campaign Space from `custom_data.client_campaign` through the shared interactive `ClientCampaignCell`; manual changes stamp `client_campaign_source` and do not move the meeting.
