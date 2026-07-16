# Multi-Run Pattern Analysis

Load this during Step 3, only when 2+ runs of the same offer are in scope.

Multi-run is where the real money hides. Single-run audits catch what broke on a given day. Multi-run audits catch what's broken in the *system*. A 3-run audit that finds one repeating pattern is worth more than 3 separate single-run audits because it points at the root cause.

---

## PREREQUISITE

Every run must have its own full single-webinar audit completed first. Pattern analysis runs on top of the individual audits, not instead of them. If you try to pattern-spot before grading each run separately, you will miss the leaks.

---

## THE SIX PATTERN CHECKS

Run all six across the set of webinars in scope. Each one answers a different "why does this keep happening" question.

### 1. Same category scoring low every time
Pull the 13-category score table from each single-run audit. Stack them side by side. Flag any category that scored C or below in all runs (or all but one).

A category that fails every time isn't a mistake. It's a system gap. Name it, rank it, and put it at the top of the fix list.

Example finding:
> Category 9 (Offer Bridge / Transition) scored D, C-, and D across the three runs. Pattern verdict: the transition from teaching to pitch is a systemic leak, not a one-off mistake. Fix the bridge slide and language once, and all future runs benefit.

### 2. Same objection in every chat
Pull the Part C objection lists from each run's chat forensics. If the same top 2-3 objections show up across runs, those are not "in-the-moment" objections, they are gaps in positioning, proof, or offer structure.

Rank by frequency and cross-run consistency. The most-repeated cross-run objection is almost always the single biggest fix.

Example finding:
> "Will this work for a service business" appeared in 8 chats across 3 runs. This is a positioning gap, not an in-the-moment objection. The opt-in page and first 10 minutes need to address service-business fit or this keeps leaking.

### 3. Same drop-off point across runs
Pull the pitch drop-off timestamps and the watch-time drop-off points from each run. If attendees are leaving at the same minute mark across runs, that's a broken slide or transition.

The fix is surgical. Find the specific slide or segment, rewrite it, re-test.

Example finding:
> Attendance drops 18%, 22%, and 19% at the 42-minute mark across three runs. Pattern verdict: the slide at that position is failing. In this deck, that's the "who this isn't for" slide. Rewrite in a way that keeps buyers in while still repelling wrong-fits.

### 4. Same ICP mismatch across runs
Pull the Part A audience qualification data from each run. If the % off-ICP is consistently 30%+ across runs, the webinar isn't the problem. The traffic source is.

This finding changes the 30-day plan. No amount of content tweaking fixes the wrong audience. The fix is upstream: ad targeting, opt-in page qualifying language, confirmation page filtering.

Example finding:
> Off-ICP rate was 38%, 42%, and 35% across three runs. Pattern verdict: ad targeting is under-qualifying the top of funnel. Before re-running, tighten targeting and add a qualifying question on the opt-in page. Running the same webinar again to the same under-qualified audience is expected to produce the same close rate.

### 5. Same silent moment in chat every time
Pull the Part D chat energy arc from each run. If chat goes silent at the same beat across runs, there's a belief break that isn't landing. The teaching moment that's *supposed* to produce "mind blown" reactions is producing silence instead.

This is the highest-leverage content fix. When the belief-break lands, the close rate typically jumps.

Example finding:
> Chat goes silent during Secret 2 (internal belief break) in all three runs. Pattern verdict: the current framing of the internal belief isn't resonating. The audit rewrite in Section 8 should focus here.

### 6. Same moderation gap across runs
Pull the Part E moderation grade from each run. If moderation is weak across runs, that's a staffing and training gap, not a one-off. It's also the cheapest pattern to fix.

Example finding:
> No named moderator in chat across all three runs, buying signals were ignored or delayed in 18 cases total. Pattern verdict: before the next run, assign and train a dedicated chat moderator with scripts for the top 3 objections pulled from these transcripts.

---

## HOW TO RANK PATTERNS BY REVENUE IMPACT

For each confirmed pattern, estimate:

- **Reach** — how many attendees per run does this pattern affect (estimated or pulled from chat counts)
- **Conversion delta** — what % improvement is realistic if this pattern is fixed (be conservative)
- **Revenue per attendee** — offer price × expected close rate lift

Formula (rough):
> (attendees affected) × (expected close rate lift %) × (AOV) = estimated recovered revenue per run

Rank patterns by that number. The top 1-2 become the main body of the multi-run report.

---

## THE MULTI-RUN DELIVERABLE STRUCTURE

Multi-run reports invert the normal deliverable. The pattern analysis becomes the headline. Individual audits become appendices.

### Main body
1. **The Pattern** — the single biggest systemic finding, stated up front in one paragraph, with the revenue impact
2. **Supporting patterns** — 2-4 additional patterns ranked by revenue impact
3. **The Root Cause** — what's actually broken underneath the patterns (offer, traffic, positioning, mechanics)
4. **The Fix Plan** — specific, sequenced, 30-day plan that addresses the top pattern first
5. **Marketing Angle Rework** — what the cross-run chat data tells us about positioning and hooks (see `marketing-angles.md`)
6. **Re-Run Recommendation** — GREEN / YELLOW / RED with specific conditions

### Appendices
- Appendix A: Single-run audit for Run 1
- Appendix B: Single-run audit for Run 2
- Appendix C: Single-run audit for Run 3
- Appendix D: Consolidated follow-up list across all runs (big named recovery list)

---

## CONSOLIDATED FOLLOW-UP LIST

Pull the Part F follow-up list from each single-run audit and consolidate into one master list. Some names will appear in multiple runs (those are the hottest, they kept showing up and never bought). Rank them:

- **Tier 1** — Attended 2+ runs, scored 4-5 in chat, never bought. These are the hottest recovery leads in the entire set. Prioritize for phone outreach same week.
- **Tier 2** — Attended one run, scored 4-5, had an objection that never got answered. Prioritize for email with that objection addressed directly.
- **Tier 3** — Attended one run, scored 3, asked logistics questions. Standard follow-up sequence.

This consolidated list is often the single biggest dollar figure in the multi-run report.

---

## WHAT TO DO WHEN THE PATTERNS DON'T AGREE

Sometimes the runs look different from each other. Different audiences, different moderators, different outcomes. In that case:

- Check whether the runs are actually comparable (same offer, same traffic source, same format)
- If yes and they still disagree, look at what *changed* between runs instead of what repeated
- Changes that correlate with close rate changes are the finding, even if no single thing "repeated"

Example:
> Run 2 dropped moderator, close rate dropped 30%. Run 3 restored moderator, close rate recovered 22%. Pattern verdict: moderation is the controlling variable, not content.
