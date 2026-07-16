# Companion XLSX Lead List

Every client-facing audit ships with a companion XLSX alongside the DOCX. The DOCX is the diagnosis. The XLSX is the recovery tool the call team can actually sort, filter, and run.

The DOCX summarizes the leads. The XLSX is where the names, emails, scores, and recommended actions live in a format the client's sales team can work from on day one.

Load this during Step 5 when assembling the deliverable.

---

## THREE-TAB STRUCTURE

The file always has three tabs in this exact order:

### Tab 1: "Read Me"

The first tab. A one-pager that explains the file before the call team opens it.

Contents:
- ROAS.co header with client name and webinar date
- One-paragraph overview of what's in the file
- Tier definitions (the 6 tiers used in Tab 2)
- Outreach window guidance (when each tier should be contacted)
- Column definitions for the other two tabs
- A "questions? text Nate" line at the bottom

### Tab 2: "Hot Follow-Up List"

20-30 priority leads sorted into 6 tiers. This is the call team's day-one outreach list.

Columns:

| Column | Purpose |
|---|---|
| Tier | T1-T6 with emoji (see tier system below) |
| Score | 1-5 buying temperature from chat forensics Part B |
| Name | Full name from chat |
| Email | From Zoom CSV cross-reference |
| ICP Signal / Quote | The verbatim chat quote that scored them hot |
| Recommended Action | Specific next step (e.g., "phone within 24h, mention payment plan") |
| Channel | Phone / DM / email / SMS |
| Status | Empty for the call team to fill in (Open, Contacted, Booked, Closed, Dead) |

### Tab 3: "ICP-Qualified Attendees"

50-100 self-identified business owners and sales-adjacent attendees. Broader than Tab 2. This is the warm-list nurture pool.

Columns:

| Column | Purpose |
|---|---|
| Score | 1-5 buying temperature |
| Name | Full name |
| Email | From CSV |
| Self-Identified Role | Pulled from chat intro (e.g., "GM at Honda dealer," "Real estate coach in Phoenix") |
| Industry / Location | Bucket from data tables H and B (e.g., "Auto Sales / FL") |
| Engagement Level | High / Med / Low based on chat message count and watch time |
| Notes for Outreach | Specific angles to use (e.g., "asked about service business fit, send 2 case studies") |

---

## TIER SYSTEM (USE EMOJIS IN TIER LABELS)

Six tiers. Each carries a specific outreach playbook.

### T1 ✅ Already In
Confirmed buyers, payment received. Confirmation-only outreach. Welcome sequence, calendar invite for the live event, no sales motion.

### T2 🔥 Hot Buyers Who Couldn't Find the Link
Asked "where's the link," "is registration still open," "having trouble checking out" or similar. These are buyers blocked by friction. Phone within 24 hours with a direct payment link.

### T3 🌐 International / Virtual-Only
International attendees or US attendees who explicitly asked about a virtual option. Email with the virtual ticket link. Do not pitch the in-person event.

### T4 💰 Money-Timing Objections
Asked about payment plans, financing, or said "I want to but the timing is tight." Reach out with payment plan or reserve-now-pay-later framing. Phone preferred, email backup.

### T5 ⏳ Engaged Warm Leads
Active in chat, scored 3 on buying temp, no buying question, no clear objection. Add to nurture sequence and prioritize for the next webinar invite.

### T6 🚨 Service Recovery
Disruptive chatters, refund askers, complaints. NOT a sales lead. Separate handling: customer service contact, no pitching.

---

## VISUAL FORMAT

The XLSX is a ROAS product. It looks like one.

### Color-coded rows by tier
- **T1 ✅** — Green fill `#DCFCE7` with dark green text
- **T2 🔥** — Red fill `#FEE2E2` with dark red text
- **T3 🌐** — Light purple fill `#EDE9FE` with purple text
- **T4 💰** — Amber fill `#FEF3C7` with amber text
- **T5 ⏳** — Slate fill `#F1F5F9` with slate text
- **T6 🚨** — Light red `#FEE2E2` with bold red text and a leading 🚨

### Header row formatting
- Background: Navy `#0A2540`
- Text: White, bold
- Frozen header row so it stays visible when scrolling

### Title rows at top of each tab
- Row 1: ROAS.co wordmark + client name in purple `#6D28D9`, bold, 18pt
- Row 2: Subtitle with brief description and date in slate `#475569`, 11pt
- Row 3: blank spacer
- Row 4: Header row (per above)

### Column widths
- Name, Email: wide enough to show full content (25-30 char min)
- Score, Tier, Channel, Status: narrow (8-12 char)
- Quote / Notes columns: wide, with text wrap enabled

---

## REFERENCES INSIDE THE DOCX

The DOCX should reference the XLSX explicitly in two places:

1. **Section 7 (Where The Money Is)** — short paragraph plus the top 5-10 leads as a teaser table, then "full named list of [N] hot leads in the companion XLSX, Tab 2."
2. **Closing action cards** — one card titled "Run the call list" with `OWNER: [client sales lead]`, `DEADLINE: 72 hours`, `IMPACT: highest-leverage revenue recovery this week`.

---

## EXTRACTION ORDER

When building the XLSX:

1. Start from chat forensics Part B (top 10 hottest leads with scores and quotes)
2. Add chat forensics Part F (full follow-up list with objection types)
3. Cross-reference with Zoom attendee CSV to attach emails
4. Categorize each lead into a tier based on what they said and did
5. Write the recommended action per lead, pulling from the objection type
6. Fill Tab 3 from the broader chat self-ID set (Part A and Part G)
7. Build the Read Me tab last, summarizing what the call team will find

If a lead's email isn't in the Zoom CSV (chat-only attendee, no registration), flag the row and note "email not captured, contact via webinar platform DM if available."

---

## CHECKLIST BEFORE SHIPPING THE XLSX

- [ ] Three tabs in correct order (Read Me, Hot Follow-Up List, ICP-Qualified Attendees)
- [ ] All six tiers represented in Tab 2 (or noted as "none in this category" in Read Me)
- [ ] Every lead in Tab 2 has a name, email (or flagged), tier, score, quote, action, channel
- [ ] Color coding applied per tier
- [ ] Header row frozen on each data tab
- [ ] Title rows on each tab with ROAS.co branding
- [ ] Column widths set for readability, text wrap on long-form columns
- [ ] DOCX Section 7 references the XLSX explicitly
- [ ] Closing action cards include "Run the call list" with owner, deadline, impact
