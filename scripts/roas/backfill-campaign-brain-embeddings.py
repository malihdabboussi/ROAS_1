#!/usr/bin/env python3
"""Backfill ns_memories.embedding for Page Grader campaign brains (ROAS prod).

Chat search (search_campaign_brain) is hybrid semantic + lexical. Page Grader
ingest inserts memories with embedding=NULL, so semantic lane returns nothing.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOST = "lhfgtsjetcardinpgouq.supabase.co"
MODEL = "gemini-embedding-2"
DIM = 768
BATCH_FETCH = 100
DEFAULT_CONCURRENCY = 6

def load_env() -> None:
    for path in (REPO_ROOT / "scripts/roas/roas-secrets.env", REPO_ROOT / "scripts/roas/.env"):
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


def rest(method: str, path: str, body: dict | list | None = None, prefer: str | None = None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path
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
        return json.loads(raw) if raw else None, dict(resp.headers)


def embed(text: str, api_key: str) -> list[float] | None:
    cleaned = (text or "").strip()[:8000]
    if not cleaned:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:embedContent?key={api_key}"
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
            if values:
                return values
            return None
        except urllib.error.HTTPError as exc:
            last = f"{exc.code}:{exc.read()[:200]!r}"
            if exc.code in (429, 503):
                time.sleep(min(2**attempt * 0.25, 8))
                continue
            if attempt == 5:
                raise
            time.sleep(min(2**attempt * 0.25, 8))
        except Exception as exc:  # noqa: BLE001
            last = str(exc)
            time.sleep(min(2**attempt * 0.25, 8))
    raise RuntimeError(f"embed failed: {last}")


def discover_page_grader_brains() -> list[tuple[str, str]]:
    campaigns, _ = rest(
        "GET",
        "campaigns?select=id,name,config&deleted_at=is.null&limit=1000",
    )
    page_grader_campaigns: dict[str, str] = {}
    for campaign in campaigns or []:
        config = campaign.get("config") if isinstance(campaign.get("config"), dict) else {}
        external = (
            config.get("external_sources")
            if isinstance(config.get("external_sources"), dict)
            else {}
        )
        if config.get("source") != "page_grader" and not isinstance(
            external.get("page_grader"), dict
        ):
            continue
        page_grader_campaigns[str(campaign["id"])] = str(
            campaign.get("name") or campaign["id"]
        )

    brains, _ = rest(
        "GET",
        "ns_brains?select=id,campaign_id&campaign_id=not.is.null&limit=1000",
    )
    targets: list[tuple[str, str]] = []
    for brain in brains or []:
        campaign_id = str(brain.get("campaign_id") or "")
        if campaign_id not in page_grader_campaigns:
            continue
        targets.append(
            (
                str(brain["id"]),
                f"{page_grader_campaigns[campaign_id]}:{str(brain['id'])[:8]}",
            )
        )
    return targets


def embed_and_store(row: dict, api_key: str) -> bool:
    vec = embed(row.get("content") or "", api_key)
    if not vec:
        return False
    vec_literal = "[" + ",".join(str(float(x)) for x in vec) + "]"
    rest(
        "PATCH",
        f"ns_memories?id=eq.{row['id']}",
        {"embedding": vec_literal},
    )
    return True


def backfill_brain(
    brain_id: str,
    label: str,
    limit: int | None,
    concurrency: int,
) -> None:
    api_key = os.environ["GEMINI_API_KEY"]
    done = 0
    offset = 0
    while True:
        path = (
            f"ns_memories?select=id,content&brain_id=eq.{brain_id}&embedding=is.null"
            f"&order=created_at.asc&offset={offset}&limit={BATCH_FETCH}"
        )
        rows, _ = rest("GET", path)
        if not rows:
            break
        remaining = None if limit is None else max(limit - done, 0)
        if remaining == 0:
            print(f"[{label}] hit --limit={limit}")
            return
        batch = rows if remaining is None else rows[:remaining]
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            for succeeded in pool.map(
                lambda row: embed_and_store(row, api_key),
                batch,
            ):
                if not succeeded:
                    continue
                done += 1
                if done % 25 == 0:
                    print(f"[{label}] embedded {done}", flush=True)
        if len(rows) < BATCH_FETCH:
            break
        # after patching, nulls shrink — keep offset 0
        offset = 0
    print(f"[{label}] done, embedded {done}")


def count_missing(brain_id: str) -> int:
    _, headers = rest(
        "GET",
        (
            f"ns_memories?select=id&brain_id=eq.{brain_id}&embedding=is.null"
            "&source_type=like.page_grader_%25&limit=1"
        ),
        prefer="count=exact",
    )
    content_range = headers.get("Content-Range", "0-0/0")
    return int(content_range.rsplit("/", 1)[-1])


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--brain-id", default=None)
    parser.add_argument("--label", default="selected")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.concurrency < 1 or args.concurrency > 12:
        raise SystemExit("--concurrency must be between 1 and 12")
    load_env()
    if DEFAULT_HOST not in os.environ.get("SUPABASE_URL", ""):
        raise SystemExit("Refusing non-ROAS host")
    targets = (
        [(args.brain_id, args.label)]
        if args.brain_id
        else discover_page_grader_brains()
    )
    if not targets:
        raise SystemExit("No Page Grader campaign brains found")
    print(f"Found {len(targets)} Page Grader campaign brain(s)")
    if args.dry_run:
        total = 0
        for brain_id, label in targets:
            missing = count_missing(brain_id)
            total += missing
            print(f"[{label}] missing {missing}")
        print(f"Total missing Page Grader memory embeddings: {total}")
        return
    for brain_id, label in targets:
        backfill_brain(brain_id, label, args.limit, args.concurrency)


if __name__ == "__main__":
    main()
