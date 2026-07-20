#!/usr/bin/env python3
"""
Index campaign-attached Meta ads into Campaign Knowledge on ROAS prod.

Writes space_semantic_objects + space_semantic_chunks (+ structural edges) for
ad_campaign / ad_set / ad rows that already exist under a Vibey campaign.

Hierarchy edges: Space → ad_campaign → ad_set → ad (no Space → ad star).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOST = "lhfgtsjetcardinpgouq.supabase.co"
MODEL = "gemini-embedding-2"
DIM = 768

CAMPAIGNS = {
    "sakha_org": {
        "campaign_id": "a922909b-eff9-4652-854b-789d5e445c1c",
        "space_id": "ae308930-337e-49ba-8159-d3a0e4c48e02",
    },
    "multifamily_org": {
        "campaign_id": "af082417-8ae9-44d0-b5f5-4f8fd309f04a",
        "space_id": "7aefc857-2a52-456a-b8e4-4e663e3950e7",
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
    if "SUPABASE_URL" not in os.environ:
        os.environ["SUPABASE_URL"] = f"https://{DEFAULT_HOST}"


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def rest(
    method: str,
    path: str,
    body: dict | list | None = None,
    prefer: str | None = None,
    params: str = "",
):
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path + params
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    data = None if body is None else json.dumps(body).encode()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw else None


def embed(text: str, api_key: str) -> list[float] | None:
    cleaned = (text or "").strip()[:8000]
    if not cleaned:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:embedContent?key={api_key}"
    )
    payload = {
        "content": {"parts": [{"text": cleaned}]},
        "outputDimensionality": DIM,
        "taskType": "RETRIEVAL_DOCUMENT",
    }
    last = ""
    for attempt in range(1, 6):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
            values = (data.get("embedding") or {}).get("values")
            return values if values else None
        except urllib.error.HTTPError as exc:
            last = f"{exc.code}:{exc.read()[:200]!r}"
            if exc.code in (429, 503) or attempt < 5:
                time.sleep(min(2**attempt * 0.25, 8))
                continue
            raise
        except Exception as exc:  # noqa: BLE001
            last = str(exc)
            time.sleep(min(2**attempt * 0.25, 8))
    raise RuntimeError(f"embed failed: {last}")


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) and value.strip() else ""


def fetch_all(table: str, select: str, filters: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    start = 0
    while True:
        end = start + 999
        rows = rest(
            "GET",
            table,
            params=f"?select={select}&{filters}&order=created_at.asc&offset={start}&limit=1000",
        )
        batch = rows or []
        out.extend(batch)
        if len(batch) < 1000:
            break
        start += 1000
        _ = end
    return out


def content_for(source_type: str, row: dict[str, Any]) -> tuple[str, str]:
    title = text(row.get("name")) or text(row.get("headline")) or source_type.replace("_", " ")
    parts = [
        title,
        source_type,
        text(row.get("headline")),
        text(row.get("primary_text")),
        text(row.get("description")),
        text(row.get("objective")),
        text(row.get("optimization_goal")),
        json.dumps(row.get("targeting"), indent=2) if row.get("targeting") else "",
        json.dumps(row.get("metadata"), indent=2) if row.get("metadata") else "",
    ]
    content = "\n".join(p for p in parts if p)
    return title, content


def upsert_object(
    *,
    user_id: str,
    org_id: str | None,
    space_id: str,
    campaign_id: str,
    source_type: str,
    source_id: str,
    title: str,
    content: str,
) -> str:
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "scope_type": "org" if org_id else "personal",
        "user_id": user_id,
        "org_id": org_id,
        "space_id": space_id,
        "campaign_id": campaign_id,
        "source_type": source_type,
        "source_id": source_id,
        "parent_type": None,
        "parent_id": None,
        "title": title[:200],
        "summary": content[:240],
        "metadata": {"ingest_kind": "campaign_ads_backfill"},
        "content_hash": sha256(f"{title}\n{content}"),
        "source_updated_at": now,
        "indexed_at": now,
    }
    rows = rest(
        "POST",
        "space_semantic_objects?on_conflict=source_type,source_id",
        payload,
        prefer="resolution=merge-duplicates,return=representation",
    )
    if not rows:
        raise RuntimeError(f"Failed to upsert object {source_type}/{source_id}")
    return str(rows[0]["id"])


def delete_chunks(object_id: str) -> None:
    rest("DELETE", "space_semantic_chunks", params=f"?space_object_id=eq.{object_id}")


def insert_chunk(
    *,
    object_id: str,
    user_id: str,
    org_id: str | None,
    space_id: str,
    campaign_id: str,
    source_type: str,
    source_id: str,
    title: str,
    content: str,
    embedding: list[float] | None,
) -> None:
    prefix = f"Source: {title}. Space ID: {space_id}. Campaign ID: {campaign_id}."
    embedded_text = f"{prefix}\n\n{content}"
    payload = {
        "space_object_id": object_id,
        "scope_type": "org" if org_id else "personal",
        "user_id": user_id,
        "org_id": org_id,
        "space_id": space_id,
        "campaign_id": campaign_id,
        "source_type": source_type,
        "source_id": source_id,
        "source_title": title[:200],
        "chunk_index": 0,
        "title": title[:200],
        "contextual_prefix": prefix,
        "content": content,
        "embedding": f"[{','.join(str(x) for x in embedding)}]" if embedding else None,
        "metadata": {"ingest_kind": "campaign_ads_backfill"},
        "content_hash": sha256(embedded_text),
        "source_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    rest("POST", "space_semantic_chunks", payload, prefer="return=minimal")


def load_object_ref(source_type: str, source_id: str) -> dict[str, Any] | None:
    rows = rest(
        "GET",
        "space_semantic_objects",
        params=(
            f"?select=id,scope_type,user_id,org_id,space_id,campaign_id,source_type,source_id"
            f"&source_type=eq.{source_type}&source_id=eq.{source_id}&limit=1"
        ),
    )
    return rows[0] if rows else None


def soft_delete_structural(source_type: str, source_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    patch = {"deleted_at": now, "updated_at": now}
    for side in ("from", "to"):
        rest(
            "PATCH",
            "space_semantic_edges",
            patch,
            params=(
                f"?{side}_source_type=eq.{source_type}&{side}_source_id=eq.{source_id}"
                f"&edge_class=eq.structural&deleted_at=is.null"
            ),
            prefer="return=minimal",
        )


def insert_edge(
    *,
    from_obj: dict[str, Any],
    to_obj: dict[str, Any],
    edge_type: str,
    reason: str,
) -> None:
    scope = to_obj if to_obj.get("space_id") or to_obj.get("campaign_id") else from_obj
    payload = {
        "from_object_id": from_obj["id"],
        "to_object_id": to_obj["id"],
        "from_source_type": from_obj["source_type"],
        "from_source_id": from_obj["source_id"],
        "to_source_type": to_obj["source_type"],
        "to_source_id": to_obj["source_id"],
        "edge_type": edge_type,
        "edge_class": "structural",
        "confidence": 1,
        "strength": 1,
        "reason": reason,
        "scope_type": scope.get("scope_type") or "org",
        "user_id": scope.get("user_id"),
        "org_id": scope.get("org_id"),
        "space_id": scope.get("space_id"),
        "campaign_id": scope.get("campaign_id"),
        "metadata": {},
    }
    rest("POST", "space_semantic_edges", payload, prefer="return=minimal")


def index_row(
    *,
    row: dict[str, Any],
    source_type: str,
    user_id: str,
    org_id: str | None,
    space_id: str,
    campaign_id: str,
    api_key: str,
    dry_run: bool,
) -> str | None:
    source_id = str(row["id"])
    title, content = content_for(source_type, row)
    if not content.strip():
        return None
    if dry_run:
        print(f"  dry-run {source_type}/{source_id}: {title[:60]}")
        return source_id
    object_id = upsert_object(
        user_id=user_id,
        org_id=org_id,
        space_id=space_id,
        campaign_id=campaign_id,
        source_type=source_type,
        source_id=source_id,
        title=title,
        content=content,
    )
    delete_chunks(object_id)
    vector = embed(f"Source: {title}.\n\n{content}", api_key)
    insert_chunk(
        object_id=object_id,
        user_id=user_id,
        org_id=org_id,
        space_id=space_id,
        campaign_id=campaign_id,
        source_type=source_type,
        source_id=source_id,
        title=title,
        content=content,
        embedding=vector,
    )
    return source_id


def wire_edges(campaign_id: str, space_id: str, dry_run: bool) -> None:
    if dry_run:
        return
    space_obj = load_object_ref("space", space_id)
    if not space_obj:
        # Ensure space hub exists as a lightweight object for Space → ad_campaign edges.
        camp = rest(
            "GET",
            "campaigns",
            params=f"?select=user_id,org_id,name&id=eq.{campaign_id}&limit=1",
        )[0]
        upsert_object(
            user_id=camp["user_id"],
            org_id=camp.get("org_id"),
            space_id=space_id,
            campaign_id=campaign_id,
            source_type="space",
            source_id=space_id,
            title="General",
            content="General space hub for campaign ads.",
        )
        space_obj = load_object_ref("space", space_id)

    ad_campaigns = rest(
        "GET",
        "space_semantic_objects",
        params=(
            f"?select=id,source_id,source_type,scope_type,user_id,org_id,space_id,campaign_id"
            f"&campaign_id=eq.{campaign_id}&source_type=eq.ad_campaign&space_id=eq.{space_id}"
        ),
    ) or []
    ad_sets = rest(
        "GET",
        "space_semantic_objects",
        params=(
            f"?select=id,source_id,source_type,scope_type,user_id,org_id,space_id,campaign_id"
            f"&campaign_id=eq.{campaign_id}&source_type=eq.ad_set&space_id=eq.{space_id}"
        ),
    ) or []
    ads = rest(
        "GET",
        "space_semantic_objects",
        params=(
            f"?select=id,source_id,source_type,scope_type,user_id,org_id,space_id,campaign_id"
            f"&campaign_id=eq.{campaign_id}&source_type=eq.ad&space_id=eq.{space_id}"
        ),
    ) or []

    ad_set_parent = {
        str(r["id"]): r.get("ad_campaign_id")
        for r in (
            rest(
                "GET",
                "ad_sets",
                params=f"?select=id,ad_campaign_id&campaign_id=eq.{campaign_id}",
            )
            or []
        )
    }
    ad_parent = {
        str(r["id"]): r.get("ad_set_id")
        for r in (
            rest("GET", "ads", params=f"?select=id,ad_set_id&campaign_id=eq.{campaign_id}") or []
        )
    }

    by_source = {o["source_id"]: o for o in [*ad_campaigns, *ad_sets, *ads]}

    for obj in ad_campaigns:
        soft_delete_structural("ad_campaign", obj["source_id"])
        if space_obj:
            insert_edge(
                from_obj=space_obj,
                to_obj=obj,
                edge_type="contains_artifact",
                reason="Object belongs to this Space.",
            )

    for obj in ad_sets:
        soft_delete_structural("ad_set", obj["source_id"])
        parent_id = ad_set_parent.get(obj["source_id"])
        parent = by_source.get(str(parent_id)) if parent_id else None
        if parent:
            insert_edge(
                from_obj=parent,
                to_obj=obj,
                edge_type="contains_ad_set",
                reason="Ad set belongs to this ad campaign.",
            )

    for obj in ads:
        soft_delete_structural("ad", obj["source_id"])
        parent_id = ad_parent.get(obj["source_id"])
        parent = by_source.get(str(parent_id)) if parent_id else None
        if parent:
            insert_edge(
                from_obj=parent,
                to_obj=obj,
                edge_type="contains_ad",
                reason="Ad belongs to this ad set.",
            )


def mirror_campaign(key: str, limit: int | None, dry_run: bool) -> None:
    cfg = CAMPAIGNS[key]
    campaign_id = cfg["campaign_id"]
    space_id = cfg["space_id"]
    camp = rest(
        "GET",
        "campaigns",
        params=f"?select=user_id,org_id,name&id=eq.{campaign_id}&limit=1",
    )
    if not camp:
        raise SystemExit(f"Campaign missing: {campaign_id}")
    user_id = camp[0]["user_id"]
    org_id = camp[0].get("org_id")
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not dry_run and not api_key:
        raise SystemExit("GEMINI_API_KEY (or GOOGLE_API_KEY) required for embeddings")

    ad_campaigns = fetch_all(
        "ad_campaigns",
        "id,name,objective,metadata,updated_at,created_at",
        f"campaign_id=eq.{campaign_id}",
    )
    ad_sets = fetch_all(
        "ad_sets",
        "id,name,ad_campaign_id,optimization_goal,targeting,metadata,updated_at,created_at",
        f"campaign_id=eq.{campaign_id}",
    )
    ads = fetch_all(
        "ads",
        "id,name,headline,primary_text,description,ad_set_id,metadata,updated_at,created_at",
        f"campaign_id=eq.{campaign_id}",
    )
    if limit is not None:
        ad_campaigns = ad_campaigns[:limit]
        ad_sets = ad_sets[:limit]
        ads = ads[:limit]

    print(
        f"[{key}] indexing {len(ad_campaigns)} ad_campaigns, "
        f"{len(ad_sets)} ad_sets, {len(ads)} ads → space {space_id}"
    )

    for row in ad_campaigns:
        index_row(
            row=row,
            source_type="ad_campaign",
            user_id=user_id,
            org_id=org_id,
            space_id=space_id,
            campaign_id=campaign_id,
            api_key=api_key or "",
            dry_run=dry_run,
        )
    for row in ad_sets:
        index_row(
            row=row,
            source_type="ad_set",
            user_id=user_id,
            org_id=org_id,
            space_id=space_id,
            campaign_id=campaign_id,
            api_key=api_key or "",
            dry_run=dry_run,
        )
    for row in ads:
        index_row(
            row=row,
            source_type="ad",
            user_id=user_id,
            org_id=org_id,
            space_id=space_id,
            campaign_id=campaign_id,
            api_key=api_key or "",
            dry_run=dry_run,
        )

    wire_edges(campaign_id, space_id, dry_run)
    print(f"[{key}] done")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--campaign", choices=[*CAMPAIGNS.keys(), "all"], default="sakha_org")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    load_env()
    keys = list(CAMPAIGNS.keys()) if args.campaign == "all" else [args.campaign]
    for key in keys:
        mirror_campaign(key, args.limit, args.dry_run)


if __name__ == "__main__":
    main()
