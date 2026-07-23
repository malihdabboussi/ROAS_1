"""Human-first navigation pages for the ROAS Company Wiki."""

from __future__ import annotations

import html
from typing import Any


START_TITLE = "START HERE — HOW TO USE THE ROAS WIKI"

TASK_ROUTES = (
    ("Decide whether a client is a fit", "Client Fit Qualification", "COMPANY FOUNDATIONS & CORE OPERATIONS"),
    ("Prepare or run a new-client kickoff", "Client Kickoff Preparation; Client Welcome Call", "COMPANY FOUNDATIONS & CORE OPERATIONS"),
    ("Turn a sale into an executable campaign", "Sales-to-Delivery Handoff; Campaign Success Checklist", "COMPANY FOUNDATIONS & CORE OPERATIONS"),
    ("Clarify a client request or change", "Client Communication Governance; Change Control", "COMPANY FOUNDATIONS & CORE OPERATIONS"),
    ("Build a campaign plan", "Campaign Architecture; Campaign Calendar Management", "COMPANY FOUNDATIONS & CORE OPERATIONS"),
    ("Research a market before writing", "Market Research; Customer Avatar Development", "OFFERS, MESSAGING & CONVERSION"),
    ("Create an offer", "Offer Design; Value Stack and Pricing; Guarantee Design", "OFFERS, MESSAGING & CONVERSION"),
    ("Write campaign messaging", "Copy Platform; Campaign Narrative; Copy Review and Approval", "OFFERS, MESSAGING & CONVERSION"),
    ("Write or improve a landing page", "Landing Page Copy; Landing Page Review", "OFFERS, MESSAGING & CONVERSION"),
    ("Plan a Meta campaign", "Meta Account Setup; Media Planning and Readiness", "PAID MEDIA & ADVERTISING"),
    ("Launch paid media", "Campaign Build Standard; Pre-Launch QA; Launch Day Operations", "PAID MEDIA & ADVERTISING"),
    ("Monitor or optimize paid media", "Daily Media Monitoring; Performance Optimization; Creative Testing", "PAID MEDIA & ADVERTISING"),
    ("Fix poor Meta lead quality", "Meta Account Retraining", "PAID MEDIA & ADVERTISING"),
    ("Report paid-media results", "Weekly Advertising Report; Reporting Definitions and Reconciliation — Draft", "PAID MEDIA & ADVERTISING"),
    ("Choose and scope a webinar", "Webinar Campaign Selection; Webinar Campaign Definition", "WEBINARS & EVENTS"),
    ("Plan a webinar launch", "Webinar Timeline; Webinar Offer and Funnel; Webinar Tracking and Attribution", "WEBINARS & EVENTS"),
    ("Write the webinar", "Webinar Narrative; Webinar Copy and Creative", "WEBINARS & EVENTS"),
    ("Run the live event", "Webinar Pre-Launch QA; Webinar Live Operations; Webinar Post-Event Follow-Up", "WEBINARS & EVENTS"),
    ("Build or repair GoHighLevel automation", "GoHighLevel Automation Standard", "DELIVERY, QUALITY & TEAM OPERATIONS"),
    ("Register or operate SMS", "A2P Registration and Messaging Setup; Texas and Federal SMS Compliance", "DELIVERY, QUALITY & TEAM OPERATIONS"),
    ("Improve email deliverability", "Email Deliverability Setup", "DELIVERY, QUALITY & TEAM OPERATIONS"),
    ("Handle an incident", "Crisis and Incident Escalation — Draft", "DELIVERY, QUALITY & TEAM OPERATIONS"),
    ("Set up access safely", "Secure Access Management; Proxy and Technical Environment", "DELIVERY, QUALITY & TEAM OPERATIONS"),
    ("Onboard or certify a teammate", "Team Onboarding and Role Certification", "DELIVERY, QUALITY & TEAM OPERATIONS"),
    ("Produce and approve video", "Video Production Workflow — Draft", "DELIVERY, QUALITY & TEAM OPERATIONS"),
)

CATEGORY_GUIDANCE = {
    "COMPANY FOUNDATIONS & CORE OPERATIONS": (
        "Start, govern, and close work without losing scope, ownership, decisions, or client context.",
        "qualification → handoff → kickoff → plan → communicate → control changes → close",
    ),
    "WEBINARS & EVENTS": (
        "Choose, plan, build, launch, operate, and follow up a measurable webinar or live event.",
        "selection → definition → timeline → offer/funnel → narrative → production → QA → live ops → follow-up",
    ),
    "PAID MEDIA & ADVERTISING": (
        "Prepare, launch, monitor, optimize, and report paid-media campaigns with auditable controls.",
        "account setup → planning → creative readiness → build → QA → launch → monitor → optimize → report",
    ),
    "OFFERS, MESSAGING & CONVERSION": (
        "Turn market evidence into an offer, message, conversion asset, and approved campaign narrative.",
        "research → avatar → offer → proof → message → copy → conversion asset → review",
    ),
    "DELIVERY, QUALITY & TEAM OPERATIONS": (
        "Operate the systems, compliance, quality, reporting, people, and escalation controls behind delivery.",
        "configure → test → operate → reconcile → review → escalate → maintain",
    ),
}


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def build_start_here(title: str) -> str:
    rows = "".join(
        f"<tr><td>{esc(need)}</td><td><strong>{esc(pages)}</strong></td><td>{esc(category)}</td></tr>"
        for need, pages, category in TASK_ROUTES
    )
    return f"""<h1>{esc(title)}</h1>
<p><strong>This wiki is an operating manual, not a reading library.</strong> Start with the outcome
you need below, open the named page, follow its numbered procedure, and leave the required evidence.</p>
<h2>How to get an answer or complete work</h2>
<ol><li>Name the outcome or problem in one sentence.</li><li>Find the closest “I need to…” row below.</li>
<li>Open the first named page and read <strong>Use this when</strong>. If it does not match, return here.</li>
<li>Collect the prerequisites before starting the numbered procedure.</li><li>Use the decision table
when the normal path breaks; do not invent a workaround.</li><li>Copy the working template into the
system of record and attach evidence as you work.</li><li>Run Quality Assurance and Definition of Done
before handing off. Escalate with the evidence package when the page says to.</li></ol>
<h2>I need to…</h2><table><thead><tr><th>Need or question</th><th>Open these pages in order</th>
<th>Area</th></tr></thead><tbody>{rows}</tbody></table>
<h2>How to read page status</h2><table><thead><tr><th>Status</th><th>Meaning</th><th>Your action</th></tr></thead><tbody>
<tr><td>Operational draft</td><td>Usable now and grounded in current internal evidence.</td><td>Follow it and submit corrections when newer evidence exists.</td></tr>
<tr><td>Owner review required</td><td>A useful starting process exists, but organization-specific thresholds need confirmation.</td><td>Use safe steps; obtain approval for thresholds or exceptions.</td></tr>
<tr><td>Approved exception</td><td>The standard path was intentionally changed for a recorded case.</td><td>Preserve who approved it, why, scope, and expiry.</td></tr>
</tbody></table>
<h2>If you still cannot find the answer</h2><ol><li>Search for the outcome, system, channel, or deliverable—not a person’s name.</li>
<li>Check the category index and the newest applicable source linked on the closest SOP.</li>
<li>Ask the functional owner with the request, evidence checked, decision needed, recommendation, and latest safe decision time.</li>
<li>After resolution, update the affected SOP so the next teammate does not need to ask again.</li></ol>
<h2>Wiki rules</h2><ul><li>Role names replace employee names so pages survive team changes.</li>
<li>The newest applicable evidence wins; newer but unrelated material does not.</li><li>Private credentials, compensation, and sensitive internal material do not belong here.</li>
<li>Client evidence may remain in source records; reusable Cortex lessons should be anonymized.</li>
<li>Do not treat a blank checklist item as passed.</li></ul>"""


def build_category(title: str, child_titles: list[str]) -> str:
    purpose, sequence = CATEGORY_GUIDANCE[title]
    pages = "".join(
        f"<tr><td>{index}</td><td><strong>{esc(child)}</strong></td><td>Open this page when its named outcome enters active work.</td></tr>"
        for index, child in enumerate(sorted(child_titles), 1)
    )
    return f"""<h1>{esc(title)}</h1><p><strong>Purpose:</strong> {esc(purpose)}</p>
<h2>Recommended operating sequence</h2><p>{esc(sequence)}</p>
<p>Not every engagement needs every page. Start at the first outcome that applies, then follow the
handoffs and dependencies named inside that SOP.</p>
<h2>Processes in this area</h2><table><thead><tr><th>#</th><th>Process</th><th>When to open it</th></tr></thead><tbody>{pages}</tbody></table>
<h2>How to use this area</h2><ol><li>Choose the page matching the outcome, not the teammate currently doing it.</li>
<li>Verify prerequisites and source currency.</li><li>Execute the numbered procedure and preserve evidence.</li>
<li>Use the decision and troubleshooting tables before escalating.</li><li>Complete QA and receive the handoff before moving downstream.</li></ol>
<h2>Cannot find the right process?</h2><p>Return to <strong>{START_TITLE}</strong>. If the work is
genuinely missing, record the outcome, trigger, inputs, owner, steps, decision rules, QA evidence,
escalation path, and definition of done before adding a new page.</p>"""


def build_navigation_updates(rows: list[dict[str, Any]]) -> list[tuple[dict[str, Any], str]]:
    children: dict[str, list[str]] = {}
    for row in rows:
        if row.get("parent_item_id"):
            children.setdefault(str(row["parent_item_id"]), []).append(str(row["title"]))
    updates: list[tuple[dict[str, Any], str]] = []
    for row in rows:
        if row.get("parent_item_id"):
            continue
        title = str(row["title"])
        if title.startswith("START HERE"):
            updates.append((row, build_start_here(title)))
        elif title in CATEGORY_GUIDANCE:
            updates.append((row, build_category(title, children.get(str(row["id"]), []))))
    return updates
