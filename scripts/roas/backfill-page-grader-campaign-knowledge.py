#!/usr/bin/env python3
"""
Mirror Page Grader campaign brain memories into Campaign Knowledge
(space_semantic_objects + space_semantic_chunks) on ROAS prod.

Why: Page Grader sync wrote ns_memories but Campaign Knowledge UI reads
space_semantic_objects. Dual-write was gated by SPACE_* env flags and often
skipped space resolution, leaving Objects: 0 / Last capture: Never.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from supabase import create_client

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOST = "lhfgtsjetcardinpgouq.supabase.co"
BATCH = 20

CAMPAIGNS = {
    # Personal-scope campaigns currently mapped in user_integrations (UI target).
    "multifamily": {
        "campaign_id": "152a698c-6809-4df8-b8b3-b38e83d3a5b4",
        "brain_id": "f7af474f-b375-46d8-a72e-fb74345c24a0",
        "space_id": "e6f2f929-a1f4-42c0-a212-bbdc1bece1d7",
        "page_grader_client_id": "9e1226dc-d054-4f61-a653-798bcc7cb518",
    },
    "sakha": {
        "campaign_id": "704c4d99-4323-4e7a-b8fe-decd53ba498d",
        "brain_id": "3e8c9d1f-472d-4388-8572-1156fa859bc4",
        "space_id": "05d4f744-cc74-48be-b1d3-de3aa27aafc9",
        "page_grader_client_id": "f49751a5-7d3f-44a0-9553-6f22d918c010",
    },
    # Earlier org-scoped duplicates (also kept filled).
    "multifamily_org": {
        "campaign_id": "af082417-8ae9-44d0-b5f5-4f8fd309f04a",
        "brain_id": "49856b8b-7777-4266-9214-2a4322c2e7f6",
        # Prefer personal mapped brain (same PG client; richer/ fresher sync target).
        "memory_brain_id": "f7af474f-b375-46d8-a72e-fb74345c24a0",
        "space_id": "7aefc857-2a52-456a-b8e4-4e663e3950e7",
        "page_grader_client_id": "9e1226dc-d054-4f61-a653-798bcc7cb518",
    },
    "sakha_org": {
        "campaign_id": "a922909b-eff9-4652-854b-789d5e445c1c",
        "brain_id": "b3974abc-f9da-4847-8592-6181490bda67",
        "memory_brain_id": "3e8c9d1f-472d-4388-8572-1156fa859bc4",
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


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


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


def fetch_all_memories(sb: Any, brain_id: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    start = 0
    while True:
        end = start + 999

        def _fetch(s=start, e=end):
            return (
                sb.table("ns_memories")
                .select("id,content,content_hash,source_type,source_title,memory_type,metadata")
                .eq("brain_id", brain_id)
                .order("created_at", desc=False)
                .range(s, e)
                .execute()
            )

        res = with_retry(_fetch, f"fetch memories {start}")
        rows = res.data or []
        out.extend(rows)
        if len(rows) < 1000:
            break
        start += 1000
    return out


def existing_source_ids(sb: Any, space_id: str, pg_client: str) -> set[str]:
    out: set[str] = set()
    start = 0
    while True:
        end = start + 999

        def _fetch(s=start, e=end):
            return (
                sb.table("space_semantic_objects")
                .select("source_id")
                .eq("space_id", space_id)
                .like("source_id", f"pg:{pg_client}:%")
                .range(s, e)
                .execute()
            )

        res = with_retry(_fetch, f"fetch existing {start}")
        rows = res.data or []
        for row in rows:
            if row.get("source_id"):
                out.add(row["source_id"])
        if len(rows) < 1000:
            break
        start += 1000
    return out


def mirror_campaign(sb: Any, key: str, limit: int | None) -> None:
    cfg = CAMPAIGNS[key]
    campaign_id = cfg["campaign_id"]
    brain_id = cfg["brain_id"]
    space_id = cfg["space_id"]
    pg_client = cfg["page_grader_client_id"]

    camp = (
        sb.table("campaigns")
        .select("user_id,org_id,name")
        .eq("id", campaign_id)
        .maybe_single()
        .execute()
        .data
    )
    if not camp:
        raise SystemExit(f"Campaign missing: {campaign_id}")
    user_id = camp["user_id"]
    org_id = camp["org_id"]

    memory_brain_id = cfg.get("memory_brain_id") or brain_id
    memories = fetch_all_memories(sb, memory_brain_id)
    if limit is not None:
        memories = memories[:limit]
    seen = existing_source_ids(sb, space_id, pg_client)
    print(
        f"[{key}] mirroring {len(memories)} memories → space {space_id} "
        f"(already indexed {len(seen)})"
    )

    upserted = 0
    for i in range(0, len(memories), BATCH):
        batch = memories[i : i + BATCH]
        objects: list[dict[str, Any]] = []
        for mem in batch:
            content = (mem.get("content") or "").strip()
            if not content:
                continue
            content_hash = mem.get("content_hash") or sha256(content)
            source_id = f"pg:{pg_client}:{campaign_id[:8]}:{content_hash[:24]}"
            if source_id in seen:
                continue
            seen.add(source_id)
            title = (mem.get("source_title") or mem.get("memory_type") or "Page Grader memory")[
                :200
            ]
            source_type = resolve_source_type(mem.get("source_type"), title)
            objects.append(
                {
                    "scope_type": "org" if org_id else "personal",
                    "user_id": user_id,
                    "org_id": org_id,
                    "space_id": space_id,
                    "campaign_id": campaign_id,
                    "source_type": source_type,
                    "source_id": source_id,
                    "parent_type": None,
                    "parent_id": None,
                    "title": title,
                    "summary": content[:240],
                    "metadata": {
                        "page_grader_client_id": pg_client,
                        "ingest_kind": "page_grader_memory_backfill",
                        "content_hash": content_hash,
                        "memory_source_type": mem.get("source_type"),
                        "memory_id": mem.get("id"),
                    },
                    "content_hash": sha256(f"{title}\n{content}"),
                    "content": content,
                }
            )

        if not objects:
            continue

        now = datetime.now(timezone.utc).isoformat()
        payload = [
            {
                **{k: v for k, v in obj.items() if k != "content"},
                "indexed_at": now,
                "source_updated_at": now,
            }
            for obj in objects
        ]

        with_retry(
            lambda: sb.table("space_semantic_objects")
            .upsert(payload, on_conflict="source_type,source_id")
            .execute(),
            "upsert objects",
        )

        source_ids = [o["source_id"] for o in objects]
        fetched = with_retry(
            lambda: sb.table("space_semantic_objects")
            .select("id,source_id")
            .eq("space_id", space_id)
            .in_("source_id", source_ids)
            .execute(),
            "fetch object ids",
        ).data or []
        by_source = {r["source_id"]: r["id"] for r in fetched}

        chunks = []
        for obj in objects:
            oid = by_source.get(obj["source_id"])
            if not oid:
                continue
            content = obj["content"]
            chunks.append(
                {
                    "space_object_id": oid,
                    "scope_type": obj["scope_type"],
                    "user_id": user_id,
                    "org_id": org_id,
                    "space_id": space_id,
                    "campaign_id": campaign_id,
                    "source_type": obj["source_type"],
                    "source_id": obj["source_id"],
                    "source_title": obj["title"],
                    "chunk_index": 0,
                    "title": obj["title"],
                    "contextual_prefix": f"Page Grader · {obj['title']}",
                    "content": content[:8000],
                    "embedding": None,
                    "metadata": obj["metadata"],
                    "content_hash": sha256(content[:8000]),
                    "source_updated_at": now,
                }
            )

        if chunks:
            with_retry(
                lambda: sb.table("space_semantic_chunks")
                .upsert(chunks, on_conflict="source_type,source_id,chunk_index")
                .execute(),
                "upsert chunks",
            )

        upserted += len(objects)
        print(f"  … +{upserted} new this run")
        time.sleep(0.15)

    so = (
        sb.table("space_semantic_objects")
        .select("id", count="exact")
        .eq("space_id", space_id)
        .limit(1)
        .execute()
    )
    print(f"[{key}] done. space_semantic_objects={so.count}")


def fail_stuck_atlas_job(sb: Any) -> None:
    job_id = "c2ada134-355f-40ac-a061-447e25943c3a"
    now = datetime.now(timezone.utc).isoformat()
    sb.table("brain_import_jobs").update(
        {
            "status": "failed",
            "last_error": "Superseded by page_grader_brain_sync dual-write; Atlas campaign_file_import cannot write campaign brains.",
            "completed_at": now,
            "notified_at": now,
        }
    ).eq("id", job_id).execute()
    print(f"dismissed stuck Atlas job {job_id}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--campaign",
        choices=["multifamily", "sakha", "multifamily_org", "sakha_org", "all", "mapped", "org"],
        default="mapped",
    )
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    load_env()
    url = os.environ["SUPABASE_URL"]
    if DEFAULT_HOST not in url:
        raise SystemExit(f"Refusing host {url}")
    sb = create_client(url, os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    fail_stuck_atlas_job(sb)
    if args.campaign == "all":
        targets = list(CAMPAIGNS)
    elif args.campaign == "mapped":
        targets = ["multifamily", "sakha"]
    elif args.campaign == "org":
        targets = ["multifamily_org", "sakha_org"]
    else:
        targets = [args.campaign]
    for key in targets:
        mirror_campaign(sb, key, args.limit)


if __name__ == "__main__":
    main()
