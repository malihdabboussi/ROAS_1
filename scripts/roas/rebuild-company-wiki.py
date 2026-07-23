#!/usr/bin/env python3
"""Rebuild the ROAS Company Wiki from topic summaries into executable SOPs.

The script is intentionally dry-run by default. It reads the existing ROAS Internal
wiki records, renders locally maintained, evidence-grounded operating blueprints,
rejects shallow/template-only output, and updates only the existing wiki documents
when ``--apply`` is supplied. Private company content is never sent to an external
model by this process.

Examples:
  python3 scripts/roas/rebuild-company-wiki.py --limit=1
  python3 scripts/roas/rebuild-company-wiki.py --category="PAID MEDIA & ADVERTISING" --apply
  python3 scripts/roas/rebuild-company-wiki.py --apply
"""

from __future__ import annotations

import argparse
import html
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from supabase import create_client

from company_wiki_audit import audit_rows
from company_wiki_blueprints import BLUEPRINTS, TopicBlueprint
from company_wiki_blueprints_delivery import DELIVERY_BLUEPRINTS
from company_wiki_blueprints_offers import OFFERS_BLUEPRINTS
from company_wiki_blueprints_paid_media import PAID_MEDIA_BLUEPRINTS
from company_wiki_blueprints_webinars import WEBINAR_BLUEPRINTS
from company_wiki_navigation import build_navigation_updates

ALL_BLUEPRINTS = {
    **BLUEPRINTS,
    **DELIVERY_BLUEPRINTS,
    **OFFERS_BLUEPRINTS,
    **PAID_MEDIA_BLUEPRINTS,
    **WEBINAR_BLUEPRINTS,
}

REPO_ROOT = Path(__file__).resolve().parents[2]
EXPECTED_SUPABASE_HOST = "lhfgtsjetcardinpgouq.supabase.co"
ROAS_ORG_ID = "f69bd799-3509-41b4-aaef-98f03c48c295"
ROAS_INTERNAL_CAMPAIGN_ID = "b575c900-272e-4c0d-83ee-9118f6ad5cd9"
ROAS_WIKI_SPACE_ID = "aab28e51-443d-4b45-99de-b3ef50bb84a1"
IMPORT_VERSION = "roas_master_sop_v2"
MIN_PLAIN_TEXT_CHARS = 2200

REQUIRED_HEADINGS = (
    "Purpose and outcome",
    "Use this when",
    "Prerequisites and inputs",
    "Roles and handoffs",
    "Procedure",
    "Decision rules",
    "Working template",
    "Quality assurance",
    "Troubleshooting",
    "Escalation",
    "Definition of done",
    "Sources and governance",
)

@dataclass(frozen=True)
class WikiItem:
    id: str
    title: str
    category: str
    doc_body: str
    custom_data: dict[str, Any]


@dataclass(frozen=True)
class GeneratedItem:
    item: WikiItem
    html_body: str


def load_env() -> None:
    for path in (
        REPO_ROOT / "apps/agent-api/.env",
        REPO_ROOT / "scripts/roas/roas-secrets.env",
        REPO_ROOT / "apps/api/.env",
    ):
        if not path.exists():
            continue
        for raw_line in path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def assert_safe_database(url: str) -> None:
    host = url.replace("https://", "").replace("http://", "").split("/", 1)[0]
    if host != EXPECTED_SUPABASE_HOST:
        raise SystemExit(f"Refusing Supabase host {host}; expected {EXPECTED_SUPABASE_HOST}")


def strip_html(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def extract_owner(item: WikiItem) -> str:
    match = re.search(r"<h2>Owner</h2>\s*<p>(.*?)</p>", item.doc_body, re.IGNORECASE | re.DOTALL)
    return strip_html(match.group(1)) if match else "Assigned functional owner"


def extract_evidence(item: WikiItem) -> str:
    match = re.search(r"<h2>Evidence</h2>\s*<p>(.*?)</p>", item.doc_body, re.IGNORECASE | re.DOTALL)
    return strip_html(match.group(1)) if match else "Current ROAS operating evidence and approved campaign records"


def render_rules(blueprint: TopicBlueprint) -> str:
    rows = "".join(
        f"<tr><td>{esc(value['condition'])}</td><td>{esc(value['action'])}</td>"
        f"<td>{esc(value['rationale'])}</td></tr>"
        for value in blueprint["rules"]
    )
    return (
        "<table><thead><tr><th>If this is true</th><th>Then do this</th><th>Why</th></tr></thead>"
        f"<tbody>{rows}</tbody></table>"
    )


def build_html(item: WikiItem, blueprint: TopicBlueprint) -> str:
    owner = extract_owner(item)
    evidence = extract_evidence(item)
    source_url = str(item.custom_data.get("source_url") or "").strip()
    procedure = "".join(
        f"<li><h3>Step {index}: {esc(step.split(';', 1)[0])}</h3>"
        f"<p>{esc(step)}</p><p><strong>Required evidence:</strong> Attach the current source, "
        "completed record, approval, screenshot, test record, or decision that proves this step. "
        "Name the receiving owner when the step creates a handoff.</p></li>"
        for index, step in enumerate(blueprint["steps"], 1)
    )
    rules = render_rules(blueprint)
    template_lines = "".join(
        f"<li><strong>Step {index} evidence:</strong> [link, record ID, approval, or result]</li>"
        for index, _ in enumerate(blueprint["steps"], 1)
    )
    qa_lines = "".join(
        f"<li>PASS only when Step {index} has observable evidence and its receiving owner has "
        "accepted any required handoff.</li>"
        for index, _ in enumerate(blueprint["steps"], 1)
    )
    trouble_rows = "".join(
        f"<tr><td>{esc(value['condition'])}</td><td>Missing evidence, ownership, or an unresolved "
        f"dependency</td><td>Check the source record, latest approval, and affected handoff.</td>"
        f"<td>{esc(value['action'])}</td></tr>"
        for value in blueprint["rules"]
    )
    source_link = (
        f'<p><a href="{esc(source_url)}">Open the linked source evidence</a>.</p>'
        if source_url
        else ""
    )
    status = (
        "Working standard — owner confirmation required before treating organization-specific "
        "thresholds or settings as final."
        if "draft" in item.title.lower()
        else "Operational draft — use now, then submit corrections when newer applicable evidence appears."
    )
    return f"""<h1>{esc(item.title)}</h1>
<p><strong>Outcome:</strong> {esc(blueprint['outcome'])}</p>
<p>This page is an execution guide. Follow the numbered procedure, preserve the evidence, and use
the decision rules when the normal path does not apply.</p>
<h2>Purpose and outcome</h2>
<p>{esc(blueprint['outcome'])}</p>
<p>The accountable owner must be able to show what was done, what changed, who accepted the
handoff, and whether the defined completion condition was met.</p>
<h2>Use this when</h2>
<ul><li>Use this process whenever the work or decision named in this page enters an active client,
campaign, or internal operating workflow.</li><li>Use it before committing a downstream date or
asking another function to begin dependent work.</li><li>Do not use this page to bypass a stricter
legal, platform, security, client, or approved campaign requirement.</li></ul>
<h2>Prerequisites and inputs</h2>
<ul><li>The current approved campaign brief, scope, and desired outcome.</li><li>The newest applicable
source evidence and any prior decision that this work changes.</li><li>Working access to the relevant
task, communication, asset, platform, CRM, analytics, or reporting systems.</li><li>A named accountable
owner, reviewer, recipient, and required-by date.</li><li>A record where evidence, exceptions,
approvals, and retest results will be stored.</li></ul>
<h2>Roles and handoffs</h2>
<table><thead><tr><th>Role</th><th>Responsibility</th><th>Handoff evidence</th></tr></thead><tbody>
<tr><td>Accountable owner</td><td>{esc(owner)}</td><td>Completed work record and stated outcome</td></tr>
<tr><td>Requester or upstream owner</td><td>Provides usable inputs and resolves contradictions</td><td>Approved brief, source links, and decision record</td></tr>
<tr><td>Unit reviewer</td><td>Checks specialist correctness against the current source</td><td>Pass/fail checklist with corrections</td></tr>
<tr><td>Final recipient or decision owner</td><td>Accepts the handoff or chooses an exception</td><td>Explicit approval, rejection, or next decision</td></tr>
</tbody></table>
<h2>Procedure</h2><ol>{procedure}</ol>
<h2>Decision rules</h2>{rules}
<h2>Working template</h2>
<blockquote><p><strong>{esc(item.title)} work record</strong></p><p>Outcome: {esc(blueprint['outcome'])}</p>
<p>Accountable owner: [functional role]<br>Reviewer: [functional role]<br>Required by: [date and time
zone]<br>Current source: [link]<br>Affected campaign/client: [name]<br>Dependencies: [list]<br>
Decision needed: [question, options, recommendation, deadline]</p><p>Procedure evidence:</p><ul>
{template_lines}</ul><p>Final status: [pass / fail / approved exception]<br>Final recipient:
[functional role]<br>Next review date: [date]</p></blockquote>
<h2>Quality assurance</h2><p>Mark each item PASS, FAIL, NOT APPLICABLE, or APPROVED EXCEPTION.
Blank items are failures.</p><ul>{qa_lines}<li>The final output matches the newest applicable source
and contains no unsupported client claim, private credential, or person-dependent instruction.</li>
<li>Every failed check has an owner, correction, and retest result.</li><li>No affected work changed
after the recorded final review; if it did, the affected checks were rerun.</li></ul>
<h2>Troubleshooting</h2><table><thead><tr><th>Symptom</th><th>Likely cause</th><th>Check</th>
<th>Correction</th></tr></thead><tbody>{trouble_rows}</tbody></table>
<h2>Escalation</h2><p>Escalate when a decision rule blocks progress, evidence conflicts, active
customer or financial harm is possible, or the accountable owner cannot safely choose. Collect the
original request, current source, timestamps, screenshots or record IDs, affected work, impact,
options, recommendation, and latest safe decision time. The functional leader or designated campaign
decision owner makes the call. Pause only the affected work while preserving unaffected delivery.</p>
<h2>Definition of done</h2><ul><li>Every procedure step has evidence.</li><li>All decision rules were
checked and any exception was explicitly approved.</li><li>Unit and final review passed for the exact
delivered version.</li><li>The receiving owner accepted the handoff and knows the next action.</li>
<li>The result, decision, and follow-up date are recorded in the correct system of record.</li></ul>
<h2>Sources and governance</h2><p><strong>Named evidence:</strong> {esc(evidence)}</p>{source_link}
<p>{esc(status)}</p><p>Review this page whenever the named source changes, a platform or legal
requirement changes, a repeated defect exposes a missing control, or a newer applicable source is
approved. Preserve source evidence; anonymize only the reusable lesson sent to Company Cortex.</p>"""


def validate_html(body: str) -> list[str]:
    errors: list[str] = []
    plain = strip_html(body)
    if len(plain) < MIN_PLAIN_TEXT_CHARS:
        errors.append(f"only {len(plain)} plain-text characters")
    if not body.lstrip().lower().startswith("<h1"):
        errors.append("missing opening h1")
    for heading in REQUIRED_HEADINGS:
        if not re.search(rf"<h2[^>]*>\s*{re.escape(heading)}\s*</h2>", body, re.IGNORECASE):
            errors.append(f"missing heading: {heading}")
    if not re.search(r"<ol[ >]", body, re.IGNORECASE):
        errors.append("procedure has no ordered list")
    if len(re.findall(r"<li[ >]", body, re.IGNORECASE)) < 16:
        errors.append("fewer than 16 list items")
    if len(re.findall(r"<table[ >]", body, re.IGNORECASE)) < 2:
        errors.append("fewer than two operational tables")
    forbidden = ("<script", "<style", "text-white", "bg-black")
    for token in forbidden:
        if token in body.lower():
            errors.append(f"contains forbidden token: {token}")
    return errors


def generate_item(item: WikiItem) -> GeneratedItem:
    blueprint = ALL_BLUEPRINTS.get(item.title)
    if not blueprint:
        raise RuntimeError("no human-authored executable blueprint")
    body = build_html(item, blueprint)
    errors = validate_html(body)
    if errors:
        raise RuntimeError("; ".join(errors))
    return GeneratedItem(item=item, html_body=body)


def load_items(client: Any, category_filter: str | None) -> tuple[list[WikiItem], list[dict[str, Any]]]:
    spaces = (
        client.table("spaces")
        .select("id,title,campaign_id,org_id")
        .eq("id", ROAS_WIKI_SPACE_ID)
        .eq("campaign_id", ROAS_INTERNAL_CAMPAIGN_ID)
        .eq("org_id", ROAS_ORG_ID)
        .execute()
    )
    if not spaces.data:
        raise SystemExit("ROAS Internal Company Wiki space was not found")
    rows = (
        client.table("space_items")
        .select("id,title,doc_body,parent_item_id,custom_data")
        .eq("space_id", ROAS_WIKI_SPACE_ID)
        .execute()
    ).data or []
    roots = {row["id"]: row["title"] for row in rows if not row.get("parent_item_id")}
    items: list[WikiItem] = []
    for row in rows:
        parent_id = row.get("parent_item_id")
        if not parent_id:
            continue
        category = roots.get(parent_id, "Unknown")
        if category_filter and category.casefold() != category_filter.casefold():
            continue
        items.append(
            WikiItem(
                id=row["id"],
                title=row["title"],
                category=category,
                doc_body=row.get("doc_body") or "",
                custom_data=row.get("custom_data") or {},
            )
        )
    return sorted(items, key=lambda item: (item.category, item.title)), rows


def update_item(client: Any, generated: GeneratedItem) -> None:
    metadata = {
        **generated.item.custom_data,
        "import_version": IMPORT_VERSION,
        "content_quality": "executable_sop",
        "instructional_sections": list(REQUIRED_HEADINGS),
        "generated_at": datetime.now(UTC).isoformat(),
        "review_status": "owner_review_required"
        if "draft" in generated.item.title.lower()
        else "operational_draft",
    }
    client.table("space_items").update(
        {"doc_body": generated.html_body, "custom_data": metadata}
    ).eq("id", generated.item.id).eq("space_id", ROAS_WIKI_SPACE_ID).execute()


def update_navigation(client: Any, rows: list[dict[str, Any]], apply: bool) -> int:
    updates = build_navigation_updates(rows)
    for row, body in updates:
        if len(strip_html(body)) < 800 or "<table" not in body or "<ol" not in body:
            raise RuntimeError(f"navigation validation failed: {row['title']}")
        print(f"PASS NAVIGATION / {row['title']} chars={len(strip_html(body))}")
        if apply:
            metadata = {
                **(row.get("custom_data") or {}),
                "import_version": IMPORT_VERSION,
                "content_quality": "task_navigation",
                "generated_at": datetime.now(UTC).isoformat(),
                "review_status": "operational_draft",
            }
            client.table("space_items").update(
                {"doc_body": body, "custom_data": metadata}
            ).eq("id", row["id"]).eq("space_id", ROAS_WIKI_SPACE_ID).execute()
    return len(updates)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--category")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--navigation", action="store_true")
    parser.add_argument("--audit", action="store_true")
    args = parser.parse_args()

    load_env()
    supabase_url = os.environ["SUPABASE_URL"]
    assert_safe_database(supabase_url)
    client = create_client(supabase_url, os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    items, rows = load_items(client, args.category)
    if args.audit:
        return audit_rows(rows, IMPORT_VERSION, validate_html, strip_html)
    if args.navigation:
        count = update_navigation(client, rows, args.apply)
        print(f"{'updated' if args.apply else 'validated'}={count} navigation pages")
        return 0
    if args.limit:
        items = items[: args.limit]
    print(f"mode={'APPLY' if args.apply else 'DRY RUN'} items={len(items)}")

    generated: list[GeneratedItem] = []
    failures: list[str] = []
    started = time.monotonic()
    for item in items:
        try:
            result = generate_item(item)
            generated.append(result)
            print(f"PASS {item.category} / {item.title} chars={len(strip_html(result.html_body))}")
        except Exception as error:  # noqa: BLE001 - batch must report every failed topic
            failures.append(f"{item.title}: {error}")
            print(f"FAIL {item.title}: {error}", file=sys.stderr)

    if failures:
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1
    if args.apply:
        for result in sorted(generated, key=lambda value: value.item.title):
            update_item(client, result)
        print(f"updated={len(generated)} space={ROAS_WIKI_SPACE_ID}")
    print(f"completed_seconds={time.monotonic() - started:.1f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
