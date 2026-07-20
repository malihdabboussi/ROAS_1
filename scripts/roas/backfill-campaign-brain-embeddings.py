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
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOST = "lhfgtsjetcardinpgouq.supabase.co"
MODEL = "gemini-embedding-2"
DIM = 768
BATCH_FETCH = 100
CONCURRENCY_SLEEP = 0.05

BRAINS = {
    "multifamily_org": "49856b8b-7777-4266-9214-2a4322c2e7f6",
    "sakha_org": "b3974abc-f9da-4847-8592-6181490bda67",
    "multifamily_personal": "f7af474f-b375-46d8-a72e-fb74345c24a0",
    "sakha_personal": "3e8c9d1f-472d-4388-8572-1156fa859bc4",
}


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


def backfill_brain(brain_id: str, label: str, limit: int | None) -> None:
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
        for row in rows:
            if limit is not None and done >= limit:
                print(f"[{label}] hit --limit={limit}")
                return
            vec = embed(row.get("content") or "", api_key)
            if not vec:
                print(f"  skip empty {row['id'][:8]}")
                continue
            # PostgREST expects vector as string literal for pgvector
            vec_literal = "[" + ",".join(str(float(x)) for x in vec) + "]"
            rest(
                "PATCH",
                f"ns_memories?id=eq.{row['id']}",
                {"embedding": vec_literal},
            )
            done += 1
            if done % 25 == 0:
                print(f"[{label}] embedded {done}")
            time.sleep(CONCURRENCY_SLEEP)
        if len(rows) < BATCH_FETCH:
            break
        # after patching, nulls shrink — keep offset 0
        offset = 0
    print(f"[{label}] done, embedded {done}")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--brain",
        choices=[*BRAINS, "org", "all"],
        default="org",
    )
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    load_env()
    if DEFAULT_HOST not in os.environ.get("SUPABASE_URL", ""):
        raise SystemExit("Refusing non-ROAS host")
    if args.brain == "org":
        targets = ["multifamily_org", "sakha_org"]
    elif args.brain == "all":
        targets = list(BRAINS)
    else:
        targets = [args.brain]
    for key in targets:
        backfill_brain(BRAINS[key], key, args.limit)


if __name__ == "__main__":
    main()
