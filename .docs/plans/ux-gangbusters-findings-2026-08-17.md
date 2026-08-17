# UX Gangbusters Findings — August 17, 2026

Audit branch: `cursor/ux-gangbusters-audit-6a50`  
Protocol: `.docs/plans/ux-gangbusters-navigation-audit-prompt.md`  
Mode: click-through only — **no product fixes until plans confirmed**

**Sessions**

| Session | URL | Auth | Coverage |
| --- | --- | --- | --- |
| A | `localhost:3000/chats` | test user `test-1786986914` (no subscription) | New Chat deep pass |
| B | `https://app.roas.io/home` | **AUTH_REQUIRED** (login wall) | Blocked — need Dylan session in cloud browser |

Evidence screenshots (Session A): `/opt/cursor/artifacts/ux-gangbusters-2026-08-17/`

---

## Heartbeat — kickoff — 2026-08-17

Covered: branch + findings log; Session A New Chat deep click-through; Session B production auth check  
Blocked: production Dylan session not present in cloud browser; non-subscribed local user redirected to `/onboarding` for Inbox/Meetings/Clients/etc.  
Top new findings: F-001…F-008  
Next: user signs into `app.roas.io` in the connected browser → resume Inbox → Meetings → Tasks → Clients

---

## Heartbeat — New Chat (Session A)

Covered: composer click; plus menu root + Attach + Integrations + files; `@` tabs People/Artifacts/Media/Missions/Campaigns; model picker; tip rotation; More menu  
Blocked: Choose Space / Home greeting surface not on `/chats` the same way as `/home`; sidebar nav paywalled  
Top findings: F-001, F-002, F-004/F-005, F-006  
Next: production New Chat confirm + Inbox stale-chat check

---

## Findings

### F-001 — Plus menu “Attach” duplicates `@` mention taxonomy
**Surface:** New Chat composer (`ChatInput` plus menu)  
**Session:** A (code-confirmed on `main`)  
**Steps:**
1. Open New Chat / composer.
2. Click paperclip / plus.
3. Hover **Attach** → see People / Tasks / Artifacts / Media / Missions.
4. Type `@` → same conceptual browse (People / Artifacts / Media / Missions / Campaigns).
**Expected:** Attach/plus media ingress only (Local / Google Drive / Dropbox / Select from Artifacts). Mention browse lives only under `@` (and a dedicated “Add Contacts” control that inserts `@`).  
**Actual:** Root plus items are literally:
- `Add photos & files` → Local / Drive / Dropbox
- `Attach` → People / Tasks / Artifacts / Media / Missions (opens at-menu)
- `Integrations` → Meta / Stripe / Drive / Calendly / GitHub …
**Severity:** P1  
**Billion-dollar polish notes:** Two doors to the same room; “Attach” as a submenu under Attach is recursive labeling.  
**Evidence:** `eacec.webp`, `b1bb4.webp`; code `PLUS_MENU_ITEMS` / `ATTACH_MENU_ITEMS` in `chat-input-plus-menu-view.tsx`  
**Status:** Planned (P-ATTACH-01)

### F-002 — `@` Artifacts (and Media / Missions) show bare “Nothing here yet.”
**Surface:** New Chat `@` mention picker  
**Session:** A (empty org may be legitimate; still suspicious vs production Dylan org where Artifacts felt wrong)  
**Steps:** Type `@` → Artifacts / Media / Missions tabs.  
**Expected:** Real artifacts when org has them; otherwise honest empty copy + CTA (create / open Artifacts / import).  
**Actual:** Bare “Nothing here yet.” on Artifacts, Media, Missions. People and Campaigns had rows.  
**Severity:** P1 on production if false-empty; P2 if truly empty without CTA  
**Billion-dollar polish notes:** Empty copy reads like unfinished UI.  
**Evidence:** `ac96b.webp`, `7ce52.webp`, `a3794.webp`  
**Status:** Needs production retest with Dylan org; then investigate data loader vs Global Artifacts

### F-003 — Campaigns tab appears after load (tab strip shift)
**Surface:** `@` mention picker  
**Steps:** Type `@`; watch tabs while data loads.  
**Expected:** Stable tab set from first paint.  
**Actual:** Briefly fewer tabs, then Campaigns appears → layout shift.  
**Severity:** P3  
**Evidence:** Session A observation + `a3794.webp`  
**Status:** Logged

### F-004 — Integrations live inside plus menu; no separate “Plugins” affordance on chat surface
**Surface:** New Chat composer  
**Steps:** Open plus → Integrations; search chrome for Plugins.  
**Expected:** Integrations under Plugins; Attach does not own connect flows.  
**Actual:** Integrations submenu is a first-class plus-menu branch (`integrations`). No “Plugins” label found on this surface.  
**Severity:** P1 (IA) — note: Home may expose Integrations differently; production confirm needed  
**Evidence:** `f413b.webp`, `dfed4.webp`  
**Status:** Fold into P-ATTACH-01 naming/placement decision

### F-005 — Label collision: menu item “Attach” inside the attach/plus control
**Surface:** Plus menu root  
**Expected:** Distinct action labels (e.g. “Add files”, “Mention”, “Integrations”).  
**Actual:** Generic “Attach” sits beside “Add photos & files”.  
**Severity:** P2  
**Evidence:** `eacec.webp`; `PLUS_MENU_ITEMS` label `Attach`  
**Status:** Planned with P-ATTACH-01 (remove or rename)

### F-006 — Non-subscribed authenticated user hard-redirected to `/onboarding` for most nav
**Surface:** Global middleware / sidebar  
**Session:** A only  
**Steps:** From `/chats`, click Inbox / Meetings / Home / Clients.  
**Expected:** Clear in-app paywall or limited tour; return path.  
**Actual:** Hard redirect to onboarding; browser Back required; blocks audit of Inbox stale-chat hypothesis.  
**Severity:** P1 (product/business) for eval UX; audit blocker for cloud agents on trial accounts  
**Evidence:** Session A redirects  
**Status:** Deferred for product; use subscribed production session for rest of curriculum

### F-007 — Composer tips auto-rotate without user control
**Surface:** New Chat tip bar  
**Expected:** Stable tip or explicit next/prev.  
**Actual:** Rotating tips while reading.  
**Severity:** P3  
**Evidence:** Session A tip screenshots  
**Status:** Logged

### F-008 — Model picker exposes large raw model list mid-composer
**Surface:** Composer “Auto” dropdown  
**Expected:** Tier-first (Economy / Auto / Power); models in advanced.  
**Actual:** Long list of named models + Cortex Max + Add Models.  
**Severity:** P2  
**Evidence:** `f7700.webp`  
**Status:** Logged (out of Attach scope)

### F-009 — Production cloud-browser session missing (audit incomplete)
**Surface:** `https://app.roas.io`  
**Steps:** Navigate `/` and `/home` in connected browser.  
**Expected:** Dylan signed-in Home (“Good afternoon, Dylan”).  
**Actual:** Login wall / Vercel Authorize tab only.  
**Severity:** P0 blocker for remaining curriculum  
**Evidence:** Session B screenshots under `/tmp/computer-use/`  
**Status:** Waiting on user to sign in inside the cloud browser

---

## P-ATTACH-01 — confirmed (revised slightly from live labels)

**Canonical UX (confirmed by Session A + code):**

| Control | Owns |
| --- | --- |
| **Plus → Add photos & files** (keep; optionally rename control to Attach) | Local, Google Drive, Dropbox, **+ Select from Artifacts** (add) |
| **Remove plus → Attach submenu** | People / Tasks / Artifacts / Media / Missions — delete from plus menu |
| **Add Contacts / Mention** (new, beside Integrations/Plugins) | Inserts `@` + opens shared at-menu |
| **`@` typed** | Same shared at-menu |
| **Integrations / Plugins** | Keep connect flows here (rename to Plugins if product language says Plugins) |
| **Choose Space** | Stays outside plus menu on Home (already separate on Home composer) |

**Root cause:** `PLUS_MENU_ITEMS` still includes `attach` + `integrations` while at-menu owns browse; Attach submenu calls `onOpenAtMenu(tab)`.

**Do not implement until:** user confirms OR says “fix P-ATTACH-01”. Production Artifacts empty (F-002) still needs Dylan-org evidence before declaring data bug vs empty org.

---

## Blocked curriculum (until production sign-in)

- Inbox (stale old-chat check)
- Meetings
- My Tasks / All Tasks
- Clients / Client Campaigns
- Spaces / Artifacts page cross-check vs `@` Artifacts
- Shell summary Connections meeting-name polish on live meeting chat

---

## How to unblock

1. In the **cloud agent browser**, sign into `https://app.roas.io` as Dylan (Google/GitHub).
2. Reply “continue” — agent resumes from Inbox with production data.
