# GANGBUSTERS — Ultra-Detailed ROAS Platform Navigation & UX Audit Prompt

**Audience:** Cloud / computer-use agent (or human QA) with a live signed-in ROAS session  
**Mode:** Click-through navigation + interaction audit (NOT mission execution / long agent runs)  
**Quality bar:** Billion-dollar product polish — every menu, every hover, every empty state, every wrong destination  
**Depth target:** Exhaustive. Prefer over-coverage. A shallow pass that “looks fine” is a failed run.  
**Working folder announce (mandatory):** Start the session with `pwd` + `git branch --show-current`.

---

## 0. Mission (read twice)

You are running a **full-platform click-through audit** of the ROAS / Vibey web app (`apps/web`). Your job is not to “spot-check.” Your job is to **literally click every navigable control**, open every menu, hover every submenu, exercise every empty/loading/error path you can reach without destroying production data, and log findings with the same density as the **New Chat → Attach / `@` gold example** below.

### Primary goals

1. **Does every click take me where it should?** Wrong route, stale chat, wrong space, ghost state, leftover panel = bug.
2. **Is every menu coherent?** Duplicate affordances, dead ends, empty lists that should have data, labels that lie = bug / UX debt.
3. **Would this feel like a billion-dollar company?** Spacing, naming, redundancy, “why is this here?”, micro-copy, hover polish, keyboard focus = log it.
4. **Plan before you fix.** Findings first → ranked plan → then implement only approved / clearly in-scope fixes. Never shotgun-fix while exploring.

### Explicit non-goals (do NOT burn the run on these)

- Do **not** run full missions / multi-step agent workflows end-to-end unless a click literally requires a one-step confirm to validate the menu item exists.
- Do **not** spend the run generating long Pixel outputs, video, or bulk campaign builds.
- Do **not** mutate production billing, delete orgs, or rotate secrets.
- Do **not** merge to `main`. Work on `cursor/<topic>-6a50` branches; PRs stay draft unless the user asks to merge.

### What “testing” means here

| Do | Don’t |
| --- | --- |
| Click every top-level nav item | Assume a menu works because it opened once |
| Open every `+` / Attach / Plugins / `@` / filter / overflow | Skip empty states (“Nothing here yet”) — investigate *why* |
| Hover every item that reveals a flyout | Run a 20-minute mission to “test Missions” |
| Open list rows, detail panes, dropdowns, tabs | Only screenshot the happy path |
| Compare duplicate entry points (Attach vs `@` vs Plugins vs Integrations) | Leave duplicate UX undocumented |
| Note stale state (old chat on Inbox, wrong Space, leftover summary) | Rationalize stale state as “probably fine” |

---

## 1. Gold-standard finding (REFERENCE — New Chat Attach / `@`)

Use this as the **quality and specificity bar** for every other surface. If your findings are vaguer than this, you are not done.

### Observed (live)

From **New Chat / Home** (“Good afternoon, …”):

1. Typed `@` in the composer → mention picker opens with tabs: **People / Artifacts / Media / Missions / Campaigns**.
2. **People** lists contacts (`portal_user`, `managed_person`, …) — OK that data appears.
3. **Artifacts** shows **“Nothing here yet.”** even when the org almost certainly has artifacts elsewhere — suspicious data source / scope / empty-state lie.
4. Separately, the composer **Attach** (plus) menu currently overlaps the same conceptual set (People / Tasks / Artifacts / Media / Missions / Integrations / Choose Space / uploads / …).

### Product judgment (what “should” be)

This is the **reference redesign intent** for New Chat composer chrome. Capture it as Finding + Plan; implement only after the plan is written.

**Attach button should shrink to media ingress only:**

- Upload from Local
- Upload from Google Drive
- Add from Dropbox
- Select from Artifacts *(add this — missing today relative to user intent)*

**Remove from Attach** (duplicative / wrong layer):

- People / Artifacts / Media / Missions / Campaigns-style browse (already owned by `@`)
- Integrations (already owned by **Plugins**)
- Choose Space (already a dedicated **Choose Space** control)

**Add beside Plugins a dedicated “Add Contacts” (or “Mention / Add”) control** that inserts `@` into the composer and opens the same mention viewer (People / Artifacts / Media / Missions / Campaigns). One viewer, one data path — do not invent a second card.

**Investigate Artifacts empty state:** confirm the `@` Artifacts tab queries the same artifact corpus as Global Artifacts / campaign artifacts / conversation outputs. If empty for the wrong reason, fix the query/scope; if truly empty, empty copy must say so honestly and offer a path (create / open Artifacts).

### Example finding card format (COPY THIS SHAPE EVERY TIME)

```md
### F-001 — New Chat Attach duplicates `@` mention taxonomy
**Surface:** Home / New Chat composer
**Steps:**
1. Open `/home` (New Chat).
2. Click Attach / plus menu; hover every item; open each submenu.
3. Type `@`; open People, Artifacts, Media, Missions, Campaigns.
**Expected:** Attach = file/media ingress (+ Select from Artifacts). Mentions (`@` or “Add Contacts”) = people/artifacts/media/missions/campaigns via one shared picker. Plugins = integrations. Choose Space = space/campaign scope.
**Actual:** Attach exposes overlapping people/artifact/mission/integration/space actions; `@` Artifacts tab shows “Nothing here yet.”
**Severity:** High (IA confusion + likely data bug)
**Billion-dollar polish notes:** Two doors to the same room; empty Artifacts feels broken; Attach should not compete with Plugins/Choose Space.
**Evidence:** screenshots / recording paths
**Plan before fix:** (see §8 reference plan P-ATTACH-01)
**Status:** Planned | In progress | Fixed | Deferred
```

---

## 2. Operating protocol (mandatory sequence)

For **every surface** in §4:

### A. Map

1. Screenshot the first viewport.
2. List every visible control (buttons, tabs, icons, rows, overflow `…`, filters, search).
3. List every hover-revealed control.
4. Note URL + any query params (`?conv=`, `?space=`, `?meeting=`, `?wr=`).

### B. Click matrix

For each control:

1. Click it.
2. Record: destination URL, panel that opened, title/H1, whether prior surface state leaked.
3. Escape / back / close — does chrome reset cleanly?
4. Re-open — is state sticky for the right reasons only?

### C. Menu matrix

For each menu:

1. Open.
2. Hover every row (flyouts must appear, align, not clip).
3. Click every enabled row.
4. Disabled rows: confirm tooltip / reason, not silent dead click.
5. Empty states: verify data source in code if UI looks wrong (Supabase MCP / network / store) — do not guess.

### D. Cross-entry consistency

Whenever two controls do “the same job” (Attach vs `@` vs Plugins vs Integrations vs Choose Space vs Connections):

1. Document both paths.
2. Decide which is canonical.
3. Log duplication as a finding with a recommended consolidation (like the Attach gold example).

### E. Stale-state hunt (critical)

After each navigation:

1. Is an **old chat** still showing when the surface should be empty / New Chat / Inbox zero-state?
2. Is the **wrong Space / campaign / meeting** still in Connections or composer chip?
3. Is the **summary panel / artifact viewer / meeting workspace** leftover from the previous surface?
4. Does the sidebar “selected” item match the page?

If yes to any → finding. Stale state is a first-class bug class.

### F. Log continuously

Append findings to:

- `.docs/plans/ux-gangbusters-findings-YYYY-MM-DD.md` (create with header if missing)
- Changelog only when you ship a fix

Never keep findings only in chat memory.

---

## 3. Severity & ranking

| Severity | Meaning |
| --- | --- |
| **P0 Blocker** | Wrong data, dead nav, can’t leave a state, data loss risk, auth/permission lie |
| **P1 High** | IA duplication, empty list that should have rows, wrong destination, major polish break |
| **P2 Medium** | Confusing label, redundant control, hover clip, inconsistent empty copy |
| **P3 Low** | Micro-spacing, icon inconsistency, nice-to-have copy |

Rank by: user confusion × frequency of path × fix blast radius.

**Rule:** After each major surface (§4), pause and write a **mini-plan** for P0–P1 findings on that surface **before** coding fixes for that surface.

---

## 4. Surface curriculum (execute in order)

Do not skip. Inside each surface, finish the click matrix before moving on.

### 4.1 Shell chrome (global — revisit after every surface)

- Simple sidebar: every item, expand/collapse, favorites, Programs tree, Recents/history, New chat
- Advanced / HQ rail if present: every icon, every flyout
- Top bar: search ⌘K (open, type, select, dismiss), panel toggles, profile/org switcher
- Chat drawer: resize, collapse, full-screen edge, Show chat history, Summary, Show/Collapse page
- Work summary card: Connections / Outputs / Sources / Tasks — expand, empty, row click, X remove, Create
- Artifact viewer: open from an output, pin/unpin if present, close, switch chats and confirm restore behavior
- Theme: spot-check light + dark on 2–3 surfaces (token breaks = finding)

### 4.2 New Chat / Home (`/home`)

**This is the reference surface — go deepest here.**

Composer:

1. Click into input; placeholder; send empty; send short text (optional — one message max if needed).
2. **Attach / plus:** hover all; open all; screenshot tree of items.
3. **Plugins:** open all integration entries; note connect vs insert vs dead.
4. **Choose Space:** open picker; Programs / Clients / search; select; clear; confirm Connections updates.
5. **Voice / mic** if present: open/cancel only.
6. **`@` mention:** each tab (People, Artifacts, Media, Missions, Campaigns); search; select one item if safe; Escape.
7. Compare Attach vs `@` vs Plugins vs Choose Space → apply gold-example consolidation analysis.
8. Suggested next moves / tips / Create catalog if visible — open each, back out without running long work.

Greeting / empty art / keyboard focus rings / mobile width resize: note polish issues.

### 4.3 Inbox (`/home/inbox`)

1. Land on Inbox from sidebar — **is an old chat incorrectly showing?** (classic stale-state finding)
2. Every filter/tab/segment control
3. Every row open / preview / mark / archive-like control that exists
4. Empty Inbox vs populated
5. Deep link back from a thread to Inbox — selection + read state
6. Overflow menus on rows

### 4.4 Meetings (`/home/meetings`)

1. Agenda list, day/week controls, empty states
2. Open a meeting workspace; back; reopen via URL params
3. Connections meeting row name vs “Meetings” space (specific title; click opens; X removes)
4. Recap / recordings / sync affordances — open UI only; don’t force long sync jobs unless validating the button isn’t dead
5. Chat-from-meeting entry; ensure chat doesn’t steal wrong conversation

### 4.5 My Tasks (`/home/my-tasks`) + All Tasks (`/all-tasks`)

1. Filters, search, group-by, status chips
2. Open task detail; edit one safe field if needed then revert; close
3. Create affordance open/cancel
4. Agent / assign / pass-off menus — open only
5. Compare My Tasks vs All Tasks IA

### 4.6 Clients (`/clients`) + Client detail (`/clients/[id]`)

1. List, search, sort, empty
2. Open client; every tab/section
3. Campaigns under client; meetings; contacts; links out
4. Wrong-scope / duplicate “Client Spaces” style IA issues — log with evidence

### 4.7 Client Campaigns (`/client-campaigns`) + Campaigns (`/campaigns`, `/campaigns/[id]`)

1. List vs board vs table if multiple views
2. Open campaign; Spaces; Brain; artifacts; settings
3. “Open in Spaces” / href correctness
4. Create campaign modal open/cancel

### 4.8 Spaces (`/spaces`, `/spaces?space=`, items)

1. Space switcher; views; item open; artifact open
2. Chat in space; scope Connections match
3. Share / permissions menus open only
4. Item href `space` + `item` params round-trip

### 4.9 Chats / Recents (`/chats` and sidebar history)

1. Filter (scope picker), agent chip, search
2. Open chat; pin; rename menu; delete/archive if present (prefer non-destructive)
3. Slack / meeting identity icons; titles (no raw first-message dumps)
4. Passing between Recents and New Chat — no ghost composer seeds

### 4.10 Channels (`/home/channels`, `/home/channels/[id]`)

1. List; open; send not required if risky — focus nav + members/menus
2. Scope vs General chat confusion

### 4.11 Contacts (`/contacts`, `/contacts/[id]`)

1. List parity with `@` People tab (same people? same labels?)
2. Detail panes; edit menus open/cancel

### 4.12 Artifacts (`/artifacts`)

1. Populate vs empty — **compare to `@` Artifacts tab** (must explain any mismatch)
2. Open viewer; types; filters

### 4.13 Brain (`/brain`)

1. Scopes; search; empty; open item
2. Any “Loading…” stuck states

### 4.14 Team (`/team`, teams, skills)

1. Roster; team detail; skills lists
2. Permission-denied vs empty

### 4.15 Settings (`/settings`) + Integrations connected flows

1. Every settings section
2. Integration connect entry points vs composer Plugins (duplication findings)

### 4.16 Delegation desk / Lists / Flows / Studio / Programs / Projects

Visit each routed page under `(dashboard)` that your org can access. Same click matrix. If a page 404s or redirects oddly → P0/P1.

### 4.17 Auth-adjacent (only if reachable without breaking session)

Invite, org switch, no-org — open docs/help links only; don’t lock yourself out.

---

## 5. Cross-cutting audit lenses (apply everywhere)

1. **Single canonical affordance** — Attach / `@` / Plugins / Integrations / Choose Space / Connections
2. **Empty states tell the truth** — and offer a next action
3. **Names are specific** — meeting title not “Meetings”; client General qualified; no “Untitled”
4. **Click opens the artifact** — list rows and connection chips are not decoration
5. **X / remove ≠ open** — remove controls must not navigate
6. **No stale chat / scope / panel leaks** across surfaces
7. **Keyboard:** Tab order, Escape closes, Enter activates primary
8. **Responsive:** ~375px and ~1280px spot checks on Home, Inbox, Meetings, Tasks, Clients
9. **Tokens only** — hardcoded colors / `text-white` / raw hex in product UI = finding (design guidelines)
10. **H1 UPPERCASE / titles `| ROAS`** where product convention requires it
11. **Loading → content → empty** never stuck on “Loading”
12. **Error copy** uses feature `errors.config` / toast configs — raw backend strings = finding

---

## 6. Investigation rules when UI looks wrong

1. Reproduce twice.
2. Capture network (failed calls, empty 200s) and console errors.
3. Grep the web app for the control label / route; read the **full** target file + consumers before concluding.
4. For data emptiness (Artifacts, People, Inbox): verify org scope, active org id, filters, and API path — use Supabase MCP only on the production project `lhfgtsjetcardinpgouq` and **read-only** unless a fix explicitly needs a write (prefer no prod writes).
5. Check git history for *why* a duplicate control exists before deleting it.
6. If confidence &lt; 90% on removing old UX, ask / log in follow-up work — don’t silently delete.

---

## 7. Plan-before-fix gate (non-negotiable)

For each P0/P1 finding cluster:

### Write a plan stub first

```md
## P-XXXX — Title
**Findings:** F-00N…
**Root cause hypothesis:** (one paragraph, evidence-linked)
**Canonical UX decision:** what stays / what goes / what merges
**Files likely touched:** …
**Risk:** …
**Test plan:** click paths that must pass after
**Out of scope:** …
```

Only then implement. Prefer one PR per coherent cluster (e.g. `cursor/composer-attach-ia-6a50`), not a mega-PR of unrelated polish.

Follow repo protocol: guidelines, changelog, LOC checks, no commit to `main`, push branch, draft PR via ManagePullRequest.

---

## 8. REFERENCE PLAN — Attach / `@` consolidation (implement after findings logged)

### P-ATTACH-01 — Composer Attach vs Mention vs Plugins

**Findings:** F-001 (and any sibling evidence from §4.2)

**Canonical UX decision:**

| Control | Owns |
| --- | --- |
| **Attach** | Local upload, Google Drive, Dropbox, Select from Artifacts |
| **Add Contacts / Mention** (new, beside Plugins) | Inserts `@` + opens shared mention picker (People, Artifacts, Media, Missions, Campaigns) |
| **`@` typed in composer** | Same shared mention picker (no second implementation) |
| **Plugins** | Integrations |
| **Choose Space** | Campaign/Space scope (also editable in Connections) |

**Root cause hypothesis:** Plus-menu accumulated browse + ingress + integrations + scope over time; mention picker was added later without deleting the overlapping Attach entries; Artifacts tab may query a narrower/wrong corpus than Global Artifacts.

**Implementation outline (after audit evidence):**

1. Inventory `ChatInput` plus-menu policy / submenu config; delete overlapping entries from Attach.
2. Add “Select from Artifacts” to Attach media ingress if missing.
3. Add composer control beside Plugins that focuses textarea, inserts `@`, opens existing mention UI (reuse — do not fork).
4. Trace `@` Artifacts data loader; align with artifacts list API/org scope; fix empty false-negative.
5. Tests: plus-menu contents; mention open via button and `@`; Artifacts tab non-empty when artifacts exist (mocked); Choose Space / Plugins untouched.
6. Docs: `documentation/features/claude-chatgpt-shell.md` decision log + changelog.

**Out of scope for P-ATTACH-01:** Rewriting Integrations OAuth; running missions; redesigning Choose Space.

---

## 9. Deliverables (end of run)

1. **Findings log** — `.docs/plans/ux-gangbusters-findings-YYYY-MM-DD.md` with F-IDs, steps, expected/actual, severity, evidence paths.
2. **Ranked fix backlog** — P0→P3 with plan stubs (P-IDs).
3. **At least one planned cluster** ready to implement (start with P-ATTACH-01 if still valid).
4. **Walkthrough artifacts** — screenshots/recordings under `/opt/cursor/artifacts/` (or project equivalent) referenced from findings.
5. **PRs** — only for fixes you were told to ship; each with test plan checkboxes.
6. **Follow-ups** — out-of-scope debt appended to `.docs/plans/agent-follow-up-work.md`.

### Mid-run heartbeat (every surface)

Append:

```md
## Heartbeat — <surface> — <timestamp>
Covered: …
Blocked: …
Top new findings: …
Next: …
```

---

## 10. Anti-patterns (instant fail)

- “Looks good overall” with &lt; 20 findings on a full pass
- Fixing while exploring without a written plan
- Running long agent missions to avoid clicking menus
- Ignoring empty states
- Not comparing duplicate entry points
- Not checking stale chat/scope after navigation
- Committing to `main`
- Writing findings only in the PR body with no repo log file

---

## 11. Kickoff checklist (do this first)

1. Announce `pwd` + branch; create/switch `cursor/ux-gangbusters-audit-6a50` off fresh `main` for the audit log (separate fix branches per cluster later).
2. Confirm live app session (real org data — placeholders hide most bugs).
3. Create findings file for today.
4. Start §4.1 shell chrome, then §4.2 New Chat with gold-example depth.
5. After New Chat, write F-IDs + P-ATTACH-01 confirmation/adjustment **before** coding Attach.
6. Continue §4.3→§4.17 without lowering the bar.

---

## 12. One-sentence north star

**Click everything; trust nothing; log like F-001; plan before you patch; make every menu feel inevitable.**
