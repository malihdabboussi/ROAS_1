#!/usr/bin/env python3
"""
Ingest a Page Grader ROAS-BRAIN package into a ROAS campaign brain.

Default target: existing campaign named "Impact" owned by test@gmail.com
on the ROAS Supabase project (scripts/roas/roas-secrets.env).

Usage:
  python3 scripts/roas/ingest-roas-brain-package.py \\
    --package=/Users/dylanvanas/Downloads/impact-elite-roas-brain-package.json \\
    --campaign-name=Impact \\
    --owner-email=test@gmail.com

Idempotent by content_hash + page_grader metadata keys.
Skips legacy_local_only (intel notes / activity) as canonical truth.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any

from supabase import create_client

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PACKAGE = Path.home() / "Downloads" / "impact-elite-roas-brain-package.json"
DEFAULT_HOST = "lhfgtsjetcardinpgouq.supabase.co"
BLOCKED_HOSTS = {"qfrvykscoymiwwgysvsr.supabase.co"}
MAX_MEMORY_CHARS = 8000
BATCH = 100


def load_env() -> None:
    for path in (
        REPO_ROOT / "scripts/roas/roas-secrets.env",
        REPO_ROOT / "scripts/roas/.env",
    ):
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            val = val.strip().strip('"').strip("'")
            if key not in os.environ:
                os.environ[key] = val


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def truncate(text: str, limit: int = MAX_MEMORY_CHARS) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 20].rstrip() + "\n…[truncated]"


def assert_safe_host(url: str) -> None:
    host = url.replace("https://", "").replace("http://", "").split("/")[0]
    if host in BLOCKED_HOSTS:
        raise SystemExit(f"Refusing blocked host {host}")
    if host != DEFAULT_HOST:
        raise SystemExit(f"Refusing host {host}; expected {DEFAULT_HOST}")


def category_to_memory_type(category: str | None) -> str:
    mapping = {
        "strategy": "decision",
        "brand": "fact",
        "target_audience": "fact",
        "competitor": "insight",
        "feedback": "insight",
        "concern": "insight",
        "meeting_notes": "observation",
        "request": "observation",
        "project": "observation",
        "asset": "reference",
        "link": "reference",
        "general": "observation",
    }
    return mapping.get((category or "general").lower(), "observation")


def build_seed_memories(pkg: dict[str, Any], page_grader_client_id: str) -> list[dict[str, Any]]:
    client = pkg.get("client") or {}
    seeds: list[tuple[str, str, str, float, list[str]]] = []

    overview = client.get("ai_overview") or client.get("ai_summary") or ""
    if overview:
        seeds.append(
            (
                "Client overview",
                overview,
                "fact",
                0.95,
                ["page_grader_seed", "profile"],
            )
        )

    voice = client.get("ai_brand_voice")
    if voice:
        seeds.append(("Brand voice", str(voice), "preference", 0.9, ["page_grader_seed", "brand"]))

    diffs = client.get("ai_differentiators")
    if diffs:
        seeds.append(
            (
                "Differentiators",
                json.dumps(diffs, ensure_ascii=False)
                if not isinstance(diffs, str)
                else diffs,
                "insight",
                0.9,
                ["page_grader_seed", "brand"],
            )
        )

    raw = client.get("describe_what_you_do") or client.get("raw_description")
    if raw:
        seeds.append(("Onboarding description", str(raw), "fact", 0.88, ["page_grader_seed", "onboarding"]))

    for offer in pkg.get("client_offers") or []:
        name = offer.get("name") or "Offer"
        body = "\n".join(
            str(offer.get(k))
            for k in ("description", "price", "promise", "guarantee", "details", "notes")
            if offer.get(k)
        ) or json.dumps(
            {k: v for k, v in offer.items() if k not in ("id", "client_id", "embedding") and v},
            ensure_ascii=False,
            default=str,
        )[:4000]
        seeds.append((f"Offer: {name}", body, "fact", 0.92, ["page_grader_seed", "offer"]))

    for avatar in pkg.get("client_avatars") or []:
        name = avatar.get("name") or "Avatar"
        body = "\n".join(
            str(avatar.get(k))
            for k in ("description", "pain_points", "desires", "demographics", "psychographics", "notes")
            if avatar.get(k)
        ) or json.dumps(
            {k: v for k, v in avatar.items() if k not in ("id", "client_id", "embedding") and v},
            ensure_ascii=False,
            default=str,
        )[:4000]
        seeds.append((f"Avatar: {name}", body, "fact", 0.9, ["page_grader_seed", "avatar"]))

    for strat in pkg.get("client_strategies") or []:
        name = strat.get("name") or strat.get("title") or "Strategy"
        body = strat.get("content") or strat.get("strategy_notes") or strat.get("summary") or json.dumps(
            {k: v for k, v in strat.items() if k not in ("id", "client_id") and v},
            ensure_ascii=False,
            default=str,
        )[:4000]
        seeds.append((f"Strategy: {name}", str(body), "decision", 0.93, ["page_grader_seed", "strategy"]))

    for camp in pkg.get("client_campaigns") or []:
        name = camp.get("name") or "Campaign"
        parts = [
            camp.get("description"),
            camp.get("campaign_brief"),
            camp.get("campaign_overview"),
            camp.get("ad_strategy_overview"),
            camp.get("campaign_objective"),
        ]
        body = "\n\n".join(str(p) for p in parts if p) or name
        seeds.append((f"Campaign: {name}", body, "fact", 0.9, ["page_grader_seed", "campaign"]))

    notes = pkg.get("onboarding_call_notes") or []
    if isinstance(notes, dict):
        notes = [notes]
    for note in notes:
        summary = note.get("ai_summary") or note.get("offer_notes") or note.get("notes")
        if summary:
            seeds.append(
                (
                    "Onboarding call notes",
                    str(summary),
                    "insight",
                    0.88,
                    ["page_grader_seed", "onboarding"],
                )
            )

    pointers = pkg.get("source_pointers") or {}
    if pointers:
        seeds.append(
            (
                "Source pointers",
                json.dumps(pointers, ensure_ascii=False, default=str),
                "reference",
                0.7,
                ["page_grader_seed", "pointers"],
            )
        )

    out: list[dict[str, Any]] = []
    for title, content, mtype, sig, tags in seeds:
        body = truncate(f"{title}\n\n{content}")
        if not body.strip():
            continue
        out.append(
            {
                "content": body,
                "content_hash": sha256(f"seed:{page_grader_client_id}:{title}:{body}"),
                "memory_type": mtype,
                "source_type": "page_grader_seed",
                "source_id": f"seed:{page_grader_client_id}:{sha256(title)[:12]}",
                "source_title": title,
                "confidence": 0.9,
                "significance": sig,
                "tags": tags,
                "metadata": {
                    "page_grader_client_id": page_grader_client_id,
                    "ingest_kind": "structured_seed",
                    "provisional_source_snapshot": False,
                    "needs_roas_extraction": False,
                    "destination": "ROAS-BRAIN",
                },
            }
        )
    return out


def build_source_memories(pkg: dict[str, Any], page_grader_client_id: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in pkg.get("source_items") or []:
        title = (item.get("title") or "Source item").strip()
        content = (item.get("content_plain") or item.get("content") or "").strip()
        if not content:
            continue
        status = item.get("status") or "pending_review"
        body = truncate(f"{title}\n\n{content}")
        source_type = f"page_grader_{(item.get('source_type') or 'unknown')}"
        pg_id = item.get("id")
        out.append(
            {
                "content": body,
                "content_hash": sha256(f"source:{pg_id}:{body}"),
                "memory_type": category_to_memory_type(item.get("category")),
                "source_type": source_type[:64],
                "source_id": str(pg_id) if pg_id else None,
                "source_title": title[:500],
                "confidence": 0.75 if status == "confirmed" else 0.55,
                "significance": 0.7 if status == "confirmed" else 0.55,
                "tags": [
                    "page_grader_source_item",
                    str(item.get("category") or "general"),
                    str(status),
                ],
                "metadata": {
                    "page_grader_client_id": page_grader_client_id,
                    "page_grader_knowledge_entry_id": pg_id,
                    "page_grader_source_type": item.get("source_type"),
                    "page_grader_category": item.get("category"),
                    "page_grader_status": status,
                    "ingest_kind": "source_item",
                    "provisional_source_snapshot": True,
                    "needs_roas_extraction": True,
                    "destination": "ROAS-BRAIN",
                },
            }
        )
    return out


def build_evidence_rows(pkg: dict[str, Any], page_grader_client_id: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in pkg.get("source_items") or []:
        title = (item.get("title") or "Source item").strip()
        content = (item.get("content_plain") or item.get("content") or "").strip()
        if not content:
            continue
        pg_id = str(item.get("id") or sha256(title + content)[:16])
        chunk = truncate(content, 12000)
        out.append(
            {
                "source_type": f"page_grader_{(item.get('source_type') or 'unknown')}"[:64],
                "source_id": pg_id,
                "source_title": title[:500],
                "chunk_index": 0,
                "contextual_prefix": title[:500],
                "content": chunk,
                "content_hash": sha256(f"evidence:{pg_id}:0:{chunk}"),
                "metadata": {
                    "page_grader_client_id": page_grader_client_id,
                    "page_grader_status": item.get("status"),
                    "page_grader_category": item.get("category"),
                    "destination": "ROAS-BRAIN",
                },
            }
        )
    return out


def upsert_memories(sb: Any, brain_id: str, rows: list[dict[str, Any]]) -> tuple[int, int]:
    if not rows:
        return 0, 0
    hashes = [r["content_hash"] for r in rows]
    existing: set[str] = set()
    for i in range(0, len(hashes), BATCH):
        chunk = hashes[i : i + BATCH]
        res = (
            sb.table("ns_memories")
            .select("content_hash")
            .eq("brain_id", brain_id)
            .in_("content_hash", chunk)
            .execute()
        )
        for row in res.data or []:
            existing.add(row["content_hash"])

    to_insert = []
    for r in rows:
        if r["content_hash"] in existing:
            continue
        to_insert.append({**r, "brain_id": brain_id})

    inserted = 0
    for i in range(0, len(to_insert), BATCH):
        chunk = to_insert[i : i + BATCH]
        res = sb.table("ns_memories").insert(chunk).execute()
        inserted += len(res.data or chunk)
    return inserted, len(rows) - inserted


def upsert_evidence(sb: Any, brain_id: str, rows: list[dict[str, Any]]) -> tuple[int, int]:
    if not rows:
        return 0, 0
    inserted = 0
    skipped = 0
    for i in range(0, len(rows), BATCH):
        chunk = [{**r, "brain_id": brain_id} for r in rows[i : i + BATCH]]
        # Prefer upsert on unique (brain_id, source_type, source_id, chunk_index)
        res = (
            sb.table("ns_brain_evidence_chunks")
            .upsert(chunk, on_conflict="brain_id,source_type,source_id,chunk_index")
            .execute()
        )
        inserted += len(res.data or chunk)
    return inserted, skipped


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package", default=str(DEFAULT_PACKAGE))
    parser.add_argument("--campaign-name", default="Impact")
    parser.add_argument("--owner-email", default="test@gmail.com")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_env()
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    assert_safe_host(url)

    pkg_path = Path(args.package)
    pkg = json.loads(pkg_path.read_text())
    if pkg.get("destination") != "ROAS-BRAIN":
        raise SystemExit(f"Unexpected destination: {pkg.get('destination')}")

    page_grader_client_id = pkg.get("page_grader_client_id") or (pkg.get("client") or {}).get("id")
    if not page_grader_client_id:
        raise SystemExit("Missing page_grader_client_id")

    sb = create_client(url, key)
    profile = (
        sb.table("profiles").select("id,email").eq("email", args.owner_email).maybe_single().execute()
    )
    if not profile.data:
        raise SystemExit(f"Owner profile not found: {args.owner_email}")
    owner_id = profile.data["id"]

    campaign = (
        sb.table("campaigns")
        .select("id,name,user_id,org_id,context")
        .eq("user_id", owner_id)
        .eq("name", args.campaign_name)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if not campaign.data:
        raise SystemExit(
            f'Campaign "{args.campaign_name}" not found for {args.owner_email}. Create it first.'
        )
    campaign_id = campaign.data["id"]

    brain = (
        sb.table("ns_brains").select("id,name,scope,campaign_id").eq("campaign_id", campaign_id).maybe_single().execute()
    )
    if not brain.data:
        raise SystemExit(f"No brain for campaign {campaign_id}")
    brain_id = brain.data["id"]

    seeds = build_seed_memories(pkg, page_grader_client_id)
    sources = build_source_memories(pkg, page_grader_client_id)
    evidence = build_evidence_rows(pkg, page_grader_client_id)

    print("host", url)
    print("owner", args.owner_email, owner_id)
    print("campaign", campaign_id, args.campaign_name)
    print("brain", brain_id, "scope", brain.data.get("scope"))
    print("seeds", len(seeds), "source_memories", len(sources), "evidence", len(evidence))
    print("legacy_skipped", list((pkg.get("legacy_local_only") or {}).keys()))

    if args.dry_run:
        print("dry-run only")
        return 0

    # Ensure campaign brain scope
    if brain.data.get("scope") != "campaign":
        sb.table("ns_brains").update({"scope": "campaign", "name": args.campaign_name}).eq(
            "id", brain_id
        ).execute()
        print("updated brain scope -> campaign")

    # Stamp campaign context with Page Grader mapping
    context = campaign.data.get("context") or {}
    if not isinstance(context, dict):
        context = {}
    context.update(
        {
            "page_grader_client_id": page_grader_client_id,
            "unique_client_id": pkg.get("unique_client_id"),
            "roas_brain_package_version": pkg.get("package_version"),
            "roas_brain_package_exported_at": pkg.get("exported_at"),
            "client_name": (pkg.get("client") or {}).get("name"),
        }
    )
    sb.table("campaigns").update({"context": context, "goal": (pkg.get("client") or {}).get("ai_summary")}).eq(
        "id", campaign_id
    ).execute()

    seed_ins, seed_skip = upsert_memories(sb, brain_id, seeds)
    src_ins, src_skip = upsert_memories(sb, brain_id, sources)
    ev_ins, ev_skip = upsert_evidence(sb, brain_id, evidence)

    mem_count = (
        sb.table("ns_memories").select("id", count="exact").eq("brain_id", brain_id).execute().count
    )
    ev_count = (
        sb.table("ns_brain_evidence_chunks")
        .select("id", count="exact")
        .eq("brain_id", brain_id)
        .execute()
        .count
    )

    print("inserted seeds", seed_ins, "skipped", seed_skip)
    print("inserted source memories", src_ins, "skipped", src_skip)
    print("upserted evidence", ev_ins, "skipped", ev_skip)
    print("brain totals memories", mem_count, "evidence", ev_count)
    print("DONE")
    print("Next: pnpm import:brain-embeddings -- --owner-email=test@gmail.com --table=memories")
    return 0


if __name__ == "__main__":
    sys.exit(main())
