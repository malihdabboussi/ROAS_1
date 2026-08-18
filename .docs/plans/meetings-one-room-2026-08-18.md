# Meetings: one room, two doors

**Date:** 2026-08-18
**Status:** Implemented
**Owner:** Meetings / All Meetings consolidation

This is the product design for consolidating calendar events, All Meetings rows, and the meeting workspace onto **one call record**. It replaces the earlier “three homes” model.

---

## One room

Every call is one All Meetings task. Calendar, Fathom, host, recording, agenda doc, notes doc, attachments, action items, client/campaign, and call kind all live on that row.

There are not three databases. Agenda does not keep a private copy. The specialized meeting card does not keep a private copy.

If it is on a calendar, it is already an All Meetings row. Nobody has to open it first.

## Two doors (different cards, same row)

| Door | Opens | Why |
|---|---|---|
| **All Meetings** | Standard Space **task card** (fields, docs, attachments, comments) | Spreadsheet / ops. Edit status, host, client, call kind. |
| **Agenda** | Specialized **meeting card** (today’s run-of-show) | Day view. Recordings, related calls, agenda doc, action items, notes. |

Same `space_item`. Two UIs.

Default All Meetings filter: **all past days + today + tomorrow**. Clear the filter to see the rest of the future. Users can save a different default later.

## Call status

Date already means “upcoming.” Do **not** add New or Upcoming.

| Status | Who sets it |
|---|---|
| _(blank)_ | Future or not started. The date column is enough. |
| **Live** | We are on it. Replaces Start call. |
| **Completed** | Wrapped. **Default when a recording lands.** Also manual. |
| **No Show** | **Manual only.** |
| **Rescheduled** | Manual, or when the calendar event clearly moved. |

The **same dropdown** is on the All Meetings table and on the specialized Agenda card (where Start call is today). Hide **Priority** on All Meetings. Do not delete the field.

Keep **Call Kind** (Personal / Team / Client / …) and **Client / Campaign**.

## Host + Mine / Team

**Host** comes from the calendar organizer, else the Fathom recorder.

Agenda **Mine / Team** stay as filters on the same rows:

- **Mine:** I am an attendee **or** I am the host
- **Team:** I am not on it

Host is how you see whose meeting it is and peel Team off.

## Related calls (so Pixel stops asking for last week)

The specialized Agenda card gets a **Related calls** block: prior calls with the same client and/or the same people, with recording already on those rows.

When someone says “reference last week,” Pixel reads that related call’s recording/transcript from All Meetings. It must **not** ask to click Recordings + and pick a Fathom link.

That prompt is the current bug: last week’s Fathom is already on the related All Meetings row, but meeting chat does not load those transcripts, so Pixel asks the user to re-link. Related calls on the card + the same rows in chat context kill that class of ask.

Matching order: Client / Campaign map first, then overlapping people, then title. Prefer completed calls that already have a recording.

## What lives on the call

| Piece | Form |
|---|---|
| Recording | Custom field on the task (`recording_url` / equivalent) |
| Other files | Task attachments |
| Agenda | One doc on the call (this is prep — no Prep tab, no Prep for call button) |
| Notes | One doc on the call |
| Action items | Child tasks. Full-width list **under** Recordings on the specialized card |

Updating the agenda doc from either door updates the same doc.

## Tabs

- **All Meetings** is the default tab.
- **Agenda** stays the specialized day view, data from All Meetings.
- Remove **Prep**, **Social Posts**, **Funnels** from this space.
- Prep for call **button** goes. Agenda is prep.

## Post-call (both automatics)

Run the existing Pixel path (recap, action items, Slack confirm) when:

1. A recording lands (status → Completed), **or**
2. Status is set to Completed with no recording yet (idempotent when the recording later arrives)

Personal stays off the bot. Impromptu defaults to **Team** so it is not skipped.

---

## UI — All Meetings (task list)

Default filter chip: `Past + today + tomorrow` (clearable).

```
Meetings
[ All Meetings ]  Agenda  Follow-ups  Action items  …

Filter: Past + today + tomorrow ✕     [+ Task]

Name                         Call Kind   Client / Campaign      Host        Call date           Call status    Recording
Offer Brainstorm             Client      1DS · Launch           Dylan (Mine)  Tue 11:00 AM        Live           —
ROAS team debrief            Team        —                      Nate (Team)   Mon 2:00 PM         Completed      fathom…
Nicholas Raschella weekly    Client      1DS · Launch           Dylan (Mine)  Last Tue            Completed      fathom…
```

Open a row → **standard task card** (not the specialized meeting chrome).

## UI — Agenda (same rows, specialized card)

Keep today’s Agenda chrome: day list, Mine | Team, countdown, open card.

```
Agenda                    [ Mine | Team ]

Tue, Aug 18
  11:00  Offer Brainstorm     Dylan · Live      → opens specialized card
  14:00  Team standup         Nate · (blank)

Wed, Aug 19
  09:00  Weekly 1DS           Dylan · (blank)
```

Mine shows Dylan’s host + attendee rows. Team shows rows he is not on.

## UI — Specialized meeting card (Agenda door only)

```
Agenda / Offer Brainstorm Call                    [Continue in chat]
Back
Offer Brainstorm Call
Tue 11:00–11:30 · Dylan, Nicholas
[ Call status ▾ Live ]     Host: Dylan (Mine)     Client: 1DS · Launch

Recordings & attachments          (full width)
  This call: [Fathom] [Link recording]
  Attachments: …

Related calls                     (full width)
  Aug 11  Offer Brainstorm  Completed  [Open] [Recording]
  Aug 4   Offer Brainstorm  Completed  [Open] [Recording]
  ↑ Pixel uses these. No “click Recordings + and pick last week.”

Action items (3)                  (full width, native task table)
  [status] Name | Client | Campaign | Assignee | Due | + Add task

Agenda & prep                     (the agenda doc — this is prep)
  [Doc | Visual]  [Create with AI]
  …

Notes                             (notes doc)
```

No Start call. No Prep for call. Status dropdown is the control.

---

## Phase plan (one pass, in this order)

Do not ship Agenda-as-a-view before every calendar event is an All Meetings row. Status and related calls will lie.

### Step 1 — One row per call
Materialize calendar events into All Meetings as soon as they exist (same calendar id / iCal uid we already use on open). Fathom attach updates that row. Impromptu is the same table. Stamp Host (calendar organizer, else Fathom recorder).

### Step 2 — Call status + Host + default filter
Add Live / Completed / No Show / Rescheduled. Hide Priority on the All Meetings view. Default date filter: past + today + tomorrow. Status dropdown on the table. Auto-Completed when a recording lands. No Show manual. Rescheduled when the invite clearly moved.

### Step 3 — Two doors
All Meetings → existing task detail. Agenda → existing specialized workspace, same item id. Replace Start call / End call with the same status dropdown.

### Step 4 — Related calls + Pixel
Related calls block on the specialized card (same client, then same people). Meeting chat context includes those recordings/transcripts. Kill the “click Recordings + and select last week’s Fathom” prompt.

### Step 5 — Both post-call automatics
Recording ready → Completed → existing Pixel path. Status → Completed without a recording → same path, idempotent. Impromptu = Team unless Call Kind is set. Personal never enters the bot.

### Step 6 — Card + tab cleanup
Action items full width under Recordings. Recording as the custom field. Agenda + notes as the call’s docs. Remove Prep tab, Prep for call button, Social Posts, Funnels. All Meetings is the default tab. Agenda UI stays; it only changes data source and status/host/related calls.

---

## Out of scope for this pass

- Rebuilding Agenda visuals from scratch
- Deleting Priority as a field
- Auto No-show
- A new meetings database
- Mixing this into the Client / Campaign mapping PR (that mapping is an input to related calls; keep the PRs separate)
