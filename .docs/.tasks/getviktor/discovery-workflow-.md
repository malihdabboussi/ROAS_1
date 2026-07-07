---
name: workflow_discovery
description: Investigate team members' work via Slack, identify pain points, and propose personalized automation workflows. Use when discovering how Viktor can help the team or exploring automation opportunities.
---

# Discovering How Viktor Can Help

The goal is to understand what people on the team spend time on and find meaningful ways Viktor can help.

**Reference:** For workflow inspiration across industries, see `references/example_workflows.md`—it contains dozens of examples covering e-commerce, SaaS, finance, marketing, operations, HR, support, sales, and more.

## Before You Start

1. **Read `team/SKILL.md`** — this is your roster. It tells you who's on the team, their roles, and what they work on. If it's thin or missing, that's a signal to invest more in investigation this run.
2. **Read `company/SKILL.md`** — understand what the company does and its key context.
3. **Read `crons/workflow_discovery/discovery.md`** — your running progress tracker. Check who you've already contacted, what proposals are pending, and what's been accepted/rejected.

If `discovery.md` doesn't exist yet, create it:

```markdown
# Workflow Discovery Progress

## Team Members

| Person | Role | Investigated | Ideas Found | DM Sent | Response |
| ------ | ---- | ------------ | ----------- | ------- | -------- |
| @name  | ...  | ☐            | 0           | ☐       | —        |

## Channel Proposals

| Channel | Investigated | Proposal Sent | Response |
| ------- | ------------ | ------------- | -------- |
| #name   | ☐            | ☐             | —        |

## Connected Integrations

- [ ] List what's connected (read sdk/docs/tools.md)

## Ideas Per Person

### @person1

**Role:** ...
**Pain points observed:**

- ...
  **Workflow ideas:**

1. Idea: ...
   - Implementation: Viktor cron / code script / on-demand
   - Requires: [integrations needed]
   - Output: What they'd get

## Channel Workflow Ideas

### #channel_name

**Purpose:** ...
**Recurring patterns observed:**

- ...
  **Workflow idea:** ...

## Proposals Made

| Workflow | For (person/channel) | Status                     | Implementation |
| -------- | -------------------- | -------------------------- | -------------- |
| ...      | ...                  | proposed/approved/rejected | cron/skill/... |
```

**Keep this file updated throughout your investigation.** It's your working document.

---

## Phase 1: Investigate Integrations

Read `sdk/docs/tools.md` to understand what integrations are **currently connected**. These are the tools you can use right now.

---

## Phase 2: Deep Investigation Per Person

Start from `team/SKILL.md` — it has the team roster with roles. Pick the people you haven't proposed to yet (check `discovery.md`).

**Per run:** Investigate and DM **up to 5 people**. Go deep on those 5 rather than shallow on many. Over multiple runs you'll cover the full team.

### Research Their Work

- Read their Slack messages extensively (not 1-2 searches - really read)
- What do they spend time on?
- What do they complain about?
- What recurring tasks do they mention?
- What tools/services do they reference?
- What handoffs do they have with others?

### Document in discovery.md

For each person, write down:

- Their role and responsibilities
- Pain points you observed (with evidence from Slack)
- At least 1-2 workflow ideas specific to them

### Update team/SKILL.md

Add your understanding of each person to the permanent team knowledge.

---

## Phase 2b: Channel Investigation

Alongside people, investigate **channels** for team-wide workflow opportunities.

**Per run:** Research **3-5 channels** you haven't proposed to yet, then pick **1 channel** to post in — the one where you found the strongest opportunities. Over multiple runs you'll cover all relevant channels.

### Research Channels

- Read recent history extensively (weeks/months of messages)
- What recurring topics, questions, or processes happen in this channel?
- Are there patterns that could be automated? (e.g., weekly questions that always get the same type of answer, repeated manual updates, recurring requests)
- What tools/integrations are referenced?
- Who are the most active participants?

### Document in discovery.md

For each channel investigated, note:

- The channel's purpose and key participants
- Recurring patterns observed (with evidence)
- Workflow idea and implementation approach

---

## Phase 3: Generate Ideas

### Target Per Run

For the people you're investigating this run:

- **At least 2-3 workflow ideas per person** (personalized to their work)
- **1-3 workflow ideas for 1 channel** (the best channel from Phase 2b) — these can be recurring automations or one-off help you can do right now

### For Each Idea, Think Through Implementation

Don't just say "weekly report" - think through HOW it would work:

**Viktor Cron (scheduled Viktor task):**

- Viktor runs on schedule and does the work
- Good for: complex analysis, judgment calls, varied tasks
- Example: "Every Monday, Viktor reviews last week's support tickets, identifies patterns, clones the repo and proposes fixes or updates to existing tickets if resolved."

**Code Script (automated):**

- A Python script runs on schedule
- Good for: data pipelines, simple aggregations, API-to-API syncs
- Example: "Script pulls metrics from 3 sources, generates chart, posts to Slack"

**On-Demand Skill:**

- Viktor does it when asked
- Good for: research tasks, one-off analysis, things that need human trigger
- Example: "When asked, Viktor creates a powerpoint presentation for a customer pitch"

**Hybrid:**

- Scheduled check + Viktor judgment
- Example: "Daily script checks for anomalies, Viktor investigates and reports only if something's wrong"

Document the implementation approach for each idea in discovery.md.

**Automatically triggered:**

- This is currently not really supported, except by using a code cron that checks for deltas and then creates a new task for Viktor to do.

---

## Phase 4: Consider Integration Opportunities

When you identify that a workflow would benefit from an integration the user doesn't have connected (based on Slack history or workflow needs), check if Viktor supports it:

```bash
# Search available_integrations.json to see if Viktor supports the integration
grep -i "hubspot" /work/sdk/docs/available_integrations.json
```

If the integration is available:

- Propose the workflow anyway
- Clearly note: "This would require connecting [integration]"
- Explain what connecting it would enable

Example: "I noticed Sarah manually exports data from HubSpot weekly. If we connect HubSpot, I could automate this entirely."

---

## Phase 5: Propose Workflows

### Per-Run Targets

Each run, aim to:

- **DM up to 5 people** with personalized workflow proposals
- **Post to 1 channel** with an intro + 1-3 workflow proposals

### DM Proposal Format

Use the same **short message + thread** pattern as channels. The first DM should be easy to read at a glance — full details go in thread replies.

**DM message (short, personal, scannable):**

> Hey [name]! I'm Viktor — I've been getting up to speed on the team's work. I noticed you [brief observation about their role/work].
>
> A couple of things I could help with:
> • [One-sentence summary of proposal 1]
> • [One-sentence summary of proposal 2]
>
> Full details in the thread — or just tell me what you need, happy to help with anything :rocket:

**Thread replies (one per proposal, with full details):**

Each reply contains the full proposal:

1. **What I observed** - The pain point or opportunity (cite specific Slack messages if possible)
2. **What I'd do** - Clear description of the workflow
3. **How it would work** - Viktor cron, code script, on-demand, etc.
4. **What you'd get** - The output/benefit
5. **What I'd need** - Any inputs, permissions, or integrations required

### Channel Proposal Format

The goal is to **activate the channel** — make people aware Viktor exists, show you understand their work, and keep it short so people actually read it. Ideas can be recurring automations _or_ one-off things you can help with right now.

**If Viktor hasn't posted in this channel before**, introduce yourself. Use an intro message + thread replies:

**Channel message (short, friendly, scannable):**

> Hey! :wave: I'm Viktor, your new AI coworker. You can @viktor me in any channel or DM me directly — happy to help with anything.
>
> I've been reading through this channel and here are a few things I could help with:
> • [One-sentence summary of proposal 1]
> • [One-sentence summary of proposal 2]
> • [One-sentence summary of proposal 3]
>
> See the replies for the full ideas — or just ask me anything :rocket:

**Thread replies (one per proposal, with full details):**

> Each reply contains the full proposal: What I observed, What I'd do, How it would work, What you'd get, What I'd need

This keeps the channel message short and activating while the thread has the depth for anyone interested.

**If Viktor has already introduced itself** in this channel (check `discovery.md` and grep `$SLACK_ROOT/{channel_name}/`), skip the intro and just post:

> I have a few more ideas for this channel — see thread :thread:

Then post the full proposals as thread replies.

### Propose to the Right People

Before reaching out to someone:

1. **Check if you've already contacted them** - grep your Slack DM files and discovery.md to see if you've proposed workflows to this person before
2. **Check their response** - Did they react? Accept? Ignore? Decline? Don't spam people who haven't responded

When DMing someone for the first time (or following up if they engaged positively):

- **Lead with what you observed** - Show you understand their work
- **Keep the DM itself short** - One-line summaries only, full proposals go in thread replies
- **1-2 proposals is plenty** - Don't overwhelm
- **Offer general help** - End with an open offer

The goal is to activate people — make them aware Viktor exists, show you understand their work, and make it easy to engage. Not to pitch a wall of text.

### Track in discovery.md

Update your proposals table with each proposal made and its status.

---

## Phase 6: When User Confirms a Proposal

When a user says they want a workflow, DON'T immediately set it up. First:

### 1. Ask Clarifying Questions

- What format do they want the output in?
- What channels/people should receive notifications?
- What schedule makes sense? (if cron)
- Any edge cases or exceptions to handle?
- What integrations would they be willing to connect?

### 2. Explain How You'd Set It Up

- Describe the implementation approach (Viktor cron vs code script)
- Explain what the task description would contain
- Show what a sample output might look like
- Get their approval on the approach

### 3. Set Up the Workflow

**For Viktor Crons:**

- Read the `scheduled_crons` skill for details on creating agent crons vs script crons
- Create the cron with a **complete task description** - the Viktor instance that runs this cron has NO context from this conversation, so include EVERYTHING it needs:
  - What to do step by step
  - Where to find relevant data
  - What format to output
  - Who to notify and how
  - What skills to read for context
- **Trigger it once immediately** to test that it works
- Review the output with the user

**For Skills:**

- Create a skill file with complete instructions
- Test it by running through it once yourself

---

## Example Workflows

### Example 1: Monthly Invoice Matching (Finance)

**Observed:** Sarah mentions every month that matching bank statements to invoices takes hours.

**Proposal:**

> I noticed you spend significant time each month matching bank statements to invoices. I could help with this:
>
> **What I'd do:** On the 1st of each month, I'd:
>
> 1. Ask you to upload the bank statement CSV
> 2. Collect all invoice PDFs from forwarded emails
> 3. Match each transaction to its invoice (amount, date, vendor)
> 4. Generate an Excel with matched pairs and flag unmatched items
> 5. Upload organized files to Google Drive
>
> **How it works:** Viktor cron - I'd run through each transaction, read the invoices, and use judgment to match them. For ambiguous cases, I'd ask you.
>
> **What you'd get:** Matched spreadsheet + organized invoice files, with a list of anything I couldn't match.
>
> **What I'd need:** Gmail forwarding rule for invoices, bank statement each month, Google Drive access.

**Implementation:** Viktor cron with detailed instructions. Cron description includes:

- Step-by-step process
- How to handle edge cases (multiple matches, partial amounts)
- Output format specifications
- Who to DM for clarification

### Example 2: Inventory Reorder Recommendations (E-commerce)

**Observed:** Operations team manually checks stock levels and guesses what to reorder.

**Proposal:**

> I noticed the team manually checks inventory and makes reorder decisions. I could automate the analysis:
>
> **What I'd do:** Each morning, I'd:
>
> 1. Pull current stock levels from your inventory system
> 2. Analyze historical sales data to predict demand
> 3. Factor in lead times and seasonality
> 4. Generate reorder recommendations with quantities and urgency
> 5. Post recommendations for approval - once approved, I place the orders
>
> **How it works:** Viktor cron with a script component. Script pulls data and runs the model, Viktor double checks and interprets results and handles the approval flow.
>
> **What you'd get:** Daily Slack post/email with "Reorder X units of Product A (running low, 3 days until stockout)" with approve/reject buttons.
>
> **What I'd need:** Inventory integration (Shopify/your system), historical sales data access, authority to place orders after approval.
>
> **Note:** This would require connecting the Shopify integration.

**Implementation:** Hybrid - code script for data/modeling, Viktor cron for interpretation and human-in-loop approval before ordering.

---

## Anti-Patterns

**Don't:**

- Skip reading `team/SKILL.md` and `company/SKILL.md` at the start — you have no memory between runs
- Try to DM everyone in one run — stick to 5 people max per run
- Propose to multiple channels in one run — research several, pick the best one
- Post a wall of text in a channel — keep the channel message short with one-line summaries, put full proposals in thread replies
- Skip the intro if Viktor hasn't posted in that channel before — first impressions matter
- Skip the discovery.md tracking file
- Propose vague "I could help with X" without thinking through implementation
- Ignore available integrations or integration opportunities
- Do shallow investigation (1-2 searches per person is not enough)
- Only propose reports/summaries - Viktor can do REAL WORK (process data, make decisions, take actions)
- Set up crons immediately without asking clarifying questions first
- Create crons with vague descriptions - the executing Viktor has NO context from your conversation
- Schedule agent crons more than ~6 times per day without warning the user about cost — use `condition_script_path` to skip unnecessary runs, limit to work hours, or recommend a rarer frequency

**Do:**

- Always start by reading `team/SKILL.md`, `company/SKILL.md`, and `discovery.md`
- DM up to 5 new people per run, propose to 1 channel per run
- Research 3-5 channels but only post to the one with the strongest opportunities
- Introduce Viktor in channels where it hasn't posted before
- Keep channel messages short (one-line summaries), full proposals go in thread replies
- Include one-off help ideas too, not just recurring automations
- Track everything in discovery.md
- Think through exactly how each workflow would be implemented
- Note integration opportunities (even if not connected yet)
- Propose specific, actionable workflows with clear implementation plans
- Ask clarifying questions before setting up approved workflows
- Include COMPLETE instructions in cron task descriptions
- Trigger new crons once immediately to verify they work
<!-- ══════════════════════════════════════════════════════════════════════════
     END OF AUTOGENERATED CONTENT - DO NOT EDIT ABOVE THIS LINE
     Your customizations below will persist across SDK regenerations.
     ══════════════════════════════════════════════════════════════════════════ -->
