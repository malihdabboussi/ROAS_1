# Personal Campaign + Home Personal Surface

**Status:** Complete (Phases 1–4 landed; apply migrations on ROAS)  
**Created:** 2026-07-20  
**Locked product rules (Dylan):**

1. New system campaign **Personal** (`config.system_kind = 'personal'`) sits **above General** in Campaigns.
2. Personal Meetings / Personal Dashboard content lives under Personal (not General). Dylan’s current personal-account meetings space is the content template.
3. **Home always reads the personal-account Personal campaign** — same surface in every org. Org context does not replace Home’s personal agenda/tasks.
4. Agenda keeps current UI + scroll-back; merges Fathom `call` items even without a calendar event.
5. Fathom lands on Personal Meetings under Personal campaign.

## Phases

### Phase 1 — Personal system campaign ✅
### Phase 2 — Rehome content ✅
### Phase 3 — Home always personal-account ✅
### Phase 4 — Agenda + Fathom merge ✅
- Backend `getAgenda` appends unmatched personal Meetings calls in the request window as `source: 'fathom'` rows
- Matched calls still attach as `related` on calendar events
- Home badges Fathom-only rows and opens the call space item (not the meeting modal)

## Out of scope (for now)
- Per-org Personal campaign clone
- Renaming UI labels beyond “Personal”
- Cloning all org data into personal
