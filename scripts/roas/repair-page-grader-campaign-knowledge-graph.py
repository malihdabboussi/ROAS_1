#!/usr/bin/env python3
"""
Repair Campaign Knowledge for Page Grader org campaigns:
1) Ensure General Space hub objects exist
2) Remap conversation_document → typed source_types from metadata
3) Write Space → item structural edges

Targets ROAS prod host only (lhfgtsjetcardinpgouq).
"""

from __future__ import annotations

import hashlib
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from supabase import create_client

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOST = "lhfgtsjetcardinpgouq.supabase.co"
BATCH = 50

CAMPAIGNS = {
    "multifamily_org": {
        "campaign_id": "af082417-8ae9-44d0-b5f5-4f8fd309f04a",
        "space_id": "7aefc857-2a52-456a-b8e4-4e663e3950e7",
        "page_grader_client_id": "9e1226dc-d054-4f61-a653-798bcc7cb518",
    },
    "sakha_org": {
        "campaign_id": "a922909b-eff9-4652-854b-789d5e445c1c",
        "space_id": "ae308930-337e-49ba-8159-d3a0e4c48e02",
        "page_grader_client_id": "f49751a5-7d3f-44a0-9553-6f22d918c010",
    },
}


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


def with_retry(fn, label: str, attempts: int = 5):
    last = None
    for i in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            last = exc
            wait = 1.5 * (i + 1)
            print(f"  retry {label} ({i + 1}/{attempts}) after {exc}")
            time.sleep(wait)
    raise last  # type: ignore[misc]


def resolve_source_type(memory_source_type: str | None, title: str | None) -> str:
    st = (memory_source_type or "").lower()
    t = (title or "").lower()
    if st == "page_grader_seed" or "_seed" in st:
        if t.startswith("avatar") or "avatar:" in t:
            return "avatar"
        if t.startswith("offer") or "offer:" in t:
            return "offer"
        if "overview" in t or "client profile" in t:
            return "campaign_overview_snapshot"
        return "space_doc"
    if any(x in st for x in ("slack", "clickup", "discord")):
        return "channel_message"
    if any(x in st for x in ("call", "meeting", "fathom", "fireflies", "transcript")):
        return "conversation_document"
    if any(x in st for x in ("drive", "dropbox", "notion", "google", "doc")):
        return "space_doc"
    return "space_doc"


def fetch_pg_objects(sb: Any, space_id: str, pg_client: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    start = 0
    while True:
        end = start + 999

        def _fetch(s=start, e=end):
            return (
                sb.table("space_semantic_objects")
                .select(
                    "id,source_type,source_id,title,summary,user_id,org_id,space_id,campaign_id,scope_type,metadata"
                )
                .eq("space_id", space_id)
                .like("source_id", f"pg:{pg_client}:%")
                .range(s, e)
                .execute()
            )

        rows = with_retry(_fetch, f"fetch objects {start}").data or []
        out.extend(rows)
        if len(rows) < 1000:
            break
        start += 1000
    return out


def ensure_space_hub(sb: Any, campaign: dict[str, Any], space_id: str) -> dict[str, Any]:
    space_res = with_retry(
        lambda: sb.table("spaces")
        .select("id,title,org_id,campaign_id,user_id")
        .eq("id", space_id)
        .limit(1)
        .execute(),
        "load space",
    )
    space = (space_res.data or [None])[0]
    if not space:
        raise SystemExit(f"Space missing: {space_id}")

    existing_res = with_retry(
        lambda: sb.table("space_semantic_objects")
        .select("id,source_type,source_id,user_id,org_id,space_id,campaign_id,scope_type")
        .eq("source_type", "space")
        .eq("source_id", space_id)
        .limit(1)
        .execute(),
        "load space hub",
    )
    existing = (existing_res.data or [None])[0]
    if existing:
        return existing

    now = datetime.now(timezone.utc).isoformat()
    title = space.get("title") or "General"
    payload = {
        "scope_type": "org" if space.get("org_id") else "personal",
        "user_id": space["user_id"] or campaign["user_id"],
        "org_id": space.get("org_id") or campaign.get("org_id"),
        "space_id": space_id,
        "campaign_id": space.get("campaign_id") or campaign["campaign_id"],
        "source_type": "space",
        "source_id": space_id,
        "title": title,
        "summary": f"Campaign Knowledge hub for {title}",
        "metadata": {"ingest_kind": "page_grader_space_hub_repair"},
        "content_hash": hashlib.sha256(f"space:{space_id}:{title}".encode()).hexdigest(),
        "indexed_at": now,
        "source_updated_at": now,
    }
    with_retry(
        lambda: sb.table("space_semantic_objects")
        .upsert(payload, on_conflict="source_type,source_id")
        .execute(),
        "upsert space hub",
    )
    hub_res = with_retry(
        lambda: sb.table("space_semantic_objects")
        .select("id,source_type,source_id,user_id,org_id,space_id,campaign_id,scope_type")
        .eq("source_type", "space")
        .eq("source_id", space_id)
        .limit(1)
        .execute(),
        "reload space hub",
    )
    hub = (hub_res.data or [None])[0]
    if not hub:
        raise SystemExit(f"Failed to create space hub for {space_id}")
    return hub


def remap_object_types(sb: Any, rows: list[dict[str, Any]]) -> int:
    by_desired: dict[str, list[str]] = {}
    for row in rows:
        meta = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
        desired = resolve_source_type(meta.get("memory_source_type"), row.get("title"))
        current = row.get("source_type")
        if current == desired:
            continue
        by_desired.setdefault(desired, []).append(row["id"])
        row["source_type"] = desired

    changed = 0
    for desired, ids in by_desired.items():
        for i in range(0, len(ids), BATCH):
            chunk = ids[i : i + BATCH]
            with_retry(
                lambda c=chunk, d=desired: sb.table("space_semantic_objects")
                .update({"source_type": d})
                .in_("id", c)
                .execute(),
                f"batch update objects → {desired}",
            )
            with_retry(
                lambda c=chunk, d=desired: sb.table("space_semantic_chunks")
                .update({"source_type": d})
                .in_("space_object_id", c)
                .execute(),
                f"batch update chunks → {desired}",
            )
            changed += len(chunk)
            print(f"  … remapped {changed} → {desired}", flush=True)
    return changed


def edge_type_for(source_type: str) -> str:
    if source_type == "space_doc":
        return "contains_doc"
    if source_type in ("space_task",):
        return "contains_task"
    return "contains_artifact"


def write_space_edges(sb: Any, hub: dict[str, Any], rows: list[dict[str, Any]]) -> int:
    now = datetime.now(timezone.utc).isoformat()
    with_retry(
        lambda: sb.table("space_semantic_edges")
        .update({"deleted_at": now, "updated_at": now})
        .eq("edge_class", "structural")
        .eq("from_object_id", hub["id"])
        .is_("deleted_at", None)
        .execute(),
        "soft-delete hub edges",
    )

    written = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        payload = []
        for row in batch:
            if row["id"] == hub["id"]:
                continue
            payload.append(
                {
                    "scope_type": hub.get("scope_type") or row.get("scope_type") or "org",
                    "user_id": hub["user_id"],
                    "org_id": hub.get("org_id"),
                    "space_id": hub.get("space_id"),
                    "campaign_id": hub.get("campaign_id"),
                    "from_object_id": hub["id"],
                    "to_object_id": row["id"],
                    "from_source_type": hub["source_type"],
                    "from_source_id": hub["source_id"],
                    "to_source_type": row["source_type"],
                    "to_source_id": row["source_id"],
                    "edge_type": edge_type_for(row["source_type"]),
                    "edge_class": "structural",
                    "confidence": 1,
                    "strength": 1,
                    "reason": "Object belongs to this Space.",
                    "evidence": [],
                    "metadata": {"ingest_kind": "page_grader_space_edge_repair"},
                    "created_by": "system",
                    "updated_at": now,
                }
            )
        if not payload:
            continue
        with_retry(
            lambda p=payload: sb.table("space_semantic_edges").insert(p).execute(),
            "insert edges",
        )
        written += len(payload)
        print(f"  … edges {written}")
        time.sleep(0.05)
    return written


def repair_campaign(sb: Any, key: str) -> None:
    cfg = CAMPAIGNS[key]
    campaign_id = cfg["campaign_id"]
    space_id = cfg["space_id"]
    pg_client = cfg["page_grader_client_id"]

    camp_res = with_retry(
        lambda: sb.table("campaigns")
        .select("id,user_id,org_id,name")
        .eq("id", campaign_id)
        .limit(1)
        .execute(),
        "load campaign",
    )
    camp = (camp_res.data or [None])[0]
    if not camp:
        raise SystemExit(f"Campaign missing: {campaign_id}")

    print(f"[{key}] repairing Campaign Knowledge for {camp.get('name')}", flush=True)
    hub = ensure_space_hub(sb, {**cfg, **camp}, space_id)
    print(f"  hub object={hub['id']}", flush=True)

    rows = fetch_pg_objects(sb, space_id, pg_client)
    print(f"  pg objects={len(rows)}", flush=True)
    remapped = remap_object_types(sb, rows)
    print(f"  remapped types={remapped}", flush=True)

    # Refresh after type updates
    rows = fetch_pg_objects(sb, space_id, pg_client)
    edges = write_space_edges(sb, hub, rows)
    print(f"  edges written={edges}", flush=True)

    by_type: dict[str, int] = {}
    for row in rows:
        st = row.get("source_type") or "unknown"
        by_type[st] = by_type.get(st, 0) + 1
    edge_count = (
        sb.table("space_semantic_edges")
        .select("id", count="exact")
        .eq("space_id", space_id)
        .is_("deleted_at", None)
        .limit(1)
        .execute()
        .count
    )
    print(f"  by_type={by_type}", flush=True)
    print(f"  active edges={edge_count}", flush=True)

def main() -> None:
    load_env()
    url = os.environ["SUPABASE_URL"]
    if DEFAULT_HOST not in url:
        raise SystemExit(f"Refusing host {url}")
    sb = create_client(url, os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    for key in CAMPAIGNS:
        repair_campaign(sb, key)


if __name__ == "__main__":
    main()
