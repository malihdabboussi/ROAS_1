#!/usr/bin/env python3
"""Audit and safely recover Slack -> Campaign Brain imports in ROAS production.

The default mode is read-only. Recovery is intentionally a post-deploy action:
only database jobs marked ``succeeded`` whose stored Atlas response contains a
``JOB_STATUS:failed`` marker are eligible for replay.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

EXPECTED_PROJECT = "lhfgtsjetcardinpgouq"
DEFAULT_ENV = Path(
    os.environ.get("ROAS_SECRETS_FILE", Path(__file__).with_name("roas-secrets.env"))
)
TERMINAL_PATTERN = re.compile(
    r"^\s*JOB_STATUS:(completed|failed|skipped)\b([^\r\n]*)", re.MULTILINE
)


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip('"').strip("'")
    return values


def require_production_credentials(env: dict[str, str]) -> tuple[str, str]:
    base = env.get("SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    host = urllib.parse.urlparse(base).hostname
    if host != f"{EXPECTED_PROJECT}.supabase.co" or not key:
        raise SystemExit(
            "Refusing to run without the exact ROAS production URL and service-role key"
        )
    return base, key


def iter_strings(value: Any) -> Iterator[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for nested in value.values():
            yield from iter_strings(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from iter_strings(nested)


def logical_terminal_status(result: Any) -> str:
    """Return the Atlas terminal marker, preferring failure over outer success."""
    statuses: list[str] = []
    for text in iter_strings(result):
        statuses.extend(match.group(1) for match in TERMINAL_PATTERN.finditer(text))
    for preferred in ("failed", "completed", "skipped"):
        if preferred in statuses:
            return preferred
    return "missing"


def slack_source_prefix(mapping: dict[str, Any]) -> str:
    return f"slack:{mapping['slack_team_id']}:{mapping['slack_channel_id']}:"


def terminal_summary(result: Any) -> str | None:
    for text in iter_strings(result):
        match = TERMINAL_PATTERN.search(text)
        if match:
            return match.group(0).strip()[:300]
    return None


class RestClient:
    def __init__(self, base: str, key: str) -> None:
        self.base = base
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        body: Any = None,
        prefer: str | None = None,
    ) -> tuple[Any, dict[str, str]]:
        query = urllib.parse.urlencode(params or {}, safe="(),.*->")
        url = f"{self.base}/rest/v1/{path}"
        if query:
            url += f"?{query}"
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer
        payload = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(
            url, data=payload, headers=headers, method=method
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode()
            return (json.loads(raw) if raw else None), dict(response.headers)

    def get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        data, _ = self.request("GET", table, params=params)
        return data or []

    def count(self, table: str, params: dict[str, str]) -> int:
        _, headers = self.request(
            "GET", table, params={**params, "limit": "1"}, prefer="count=exact"
        )
        return int(headers.get("Content-Range", "0-0/0").rsplit("/", 1)[-1])

    def patch(self, table: str, params: dict[str, str], body: dict[str, Any]) -> Any:
        data, _ = self.request(
            "PATCH", table, params=params, body=body, prefer="return=representation"
        )
        return data

    def rpc(self, function: str, body: dict[str, Any]) -> Any:
        data, _ = self.request("POST", f"rpc/{function}", body=body)
        return data


def embed_query(text: str, api_key: str) -> list[float]:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-embedding-2:embedContent?key={urllib.parse.quote(api_key)}"
    )
    payload = {
        "content": {"parts": [{"text": text[:8000]}]},
        "outputDimensionality": 768,
        "taskType": "RETRIEVAL_QUERY",
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        body = json.load(response)
    values = (body.get("embedding") or {}).get("values")
    if not values:
        raise RuntimeError("Gemini returned no query embedding")
    return values


def fetch_mappings(
    client: RestClient, mapping_ids: list[str], org_id: str | None
) -> list[dict[str, Any]]:
    params = {
        "select": (
            "id,user_id,org_id,slack_team_id,slack_channel_id,slack_channel_name,"
            "target_campaign_id,last_synced_at,last_message_ts,enabled"
        ),
        "target_kind": "eq.campaign",
        "order": "slack_channel_name.asc",
    }
    if mapping_ids:
        params["id"] = f"in.({','.join(mapping_ids)})"
    if org_id:
        params["org_id"] = f"eq.{org_id}"
    return client.get("slack_brain_mappings", params)


def fetch_jobs(
    client: RestClient, mapping_ids: set[str], cutoff: str
) -> list[dict[str, Any]]:
    rows = client.get(
        "brain_import_jobs",
        {
            "select": (
                "id,user_id,org_id,dedupe_key,payload,status,attempts,max_attempts,"
                "last_error,result,created_at,completed_at"
            ),
            "job_type": "eq.campaign_slack_import",
            "created_at": f"gte.{cutoff}",
            "order": "created_at.desc",
            "limit": "5000",
        },
    )
    return [
        row
        for row in rows
        if str((row.get("payload") or {}).get("mappingId", "")) in mapping_ids
    ]


def fetch_active_dedupe_keys(
    client: RestClient, mapping_ids: set[str]
) -> set[str]:
    rows = client.get(
        "brain_import_jobs",
        {
            "select": "dedupe_key,payload",
            "job_type": "eq.campaign_slack_import",
            "status": "in.(queued,processing,retry)",
            "limit": "5000",
        },
    )
    return {
        str(row["dedupe_key"])
        for row in rows
        if str((row.get("payload") or {}).get("mappingId", "")) in mapping_ids
    }


def fetch_brain_id(client: RestClient, campaign_id: str) -> str | None:
    rows = client.get(
        "ns_brains",
        {"select": "id", "campaign_id": f"eq.{campaign_id}", "limit": "1"},
    )
    return str(rows[0]["id"]) if rows else None


def latest_row(
    client: RestClient, table: str, params: dict[str, str]
) -> dict[str, Any] | None:
    rows = client.get(table, {**params, "limit": "1"})
    return rows[0] if rows else None


def build_mapping_report(
    client: RestClient,
    mapping: dict[str, Any],
    jobs: list[dict[str, Any]],
) -> dict[str, Any]:
    mapping_id = str(mapping["id"])
    mapping_jobs = [
        row
        for row in jobs
        if str((row.get("payload") or {}).get("mappingId", "")) == mapping_id
    ]
    logical_counts = {key: 0 for key in ("completed", "failed", "skipped", "missing")}
    for job in mapping_jobs:
        logical_counts[logical_terminal_status(job.get("result"))] += 1
    false_successes = [
        row
        for row in mapping_jobs
        if row.get("status") == "succeeded"
        and logical_terminal_status(row.get("result")) in {"failed", "missing"}
    ]
    failed_jobs = [row for row in mapping_jobs if row.get("status") == "failed"]
    succeeded_jobs = [row for row in mapping_jobs if row.get("status") == "succeeded"]
    recent_failure_cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    recent_failed_jobs = [
        row
        for row in failed_jobs
        if datetime.fromisoformat(str(row["created_at"]).replace("Z", "+00:00"))
        >= recent_failure_cutoff
    ]

    event_params = {
        "org_id": f"eq.{mapping['org_id']}",
        "slack_team_id": f"eq.{mapping['slack_team_id']}",
        "channel_id": f"eq.{mapping['slack_channel_id']}",
    }
    latest_event = latest_row(
        client,
        "slack_observation_events",
        {**event_params, "select": "message_ts,observed_at", "order": "message_ts.desc"},
    )
    brain_id = fetch_brain_id(client, str(mapping["target_campaign_id"]))
    memory_params = {
        "brain_id": f"eq.{brain_id}",
        "source_type": "eq.slack_period",
        "source_id": f"like.{slack_source_prefix(mapping)}*",
    }
    memory_count = client.count("ns_memories", memory_params) if brain_id else 0
    embedded_count = (
        client.count("ns_memories", {**memory_params, "embedding": "not.is.null"})
        if brain_id
        else 0
    )
    latest_memory = (
        latest_row(
            client,
            "ns_memories",
            {**memory_params, "select": "id,created_at,source_id", "order": "created_at.desc"},
        )
        if brain_id
        else None
    )
    return {
        "mapping_id": mapping_id,
        "channel": mapping["slack_channel_name"],
        "enabled": mapping["enabled"],
        "campaign_id": mapping["target_campaign_id"],
        "brain_id": brain_id,
        "capture": {
            "observations": client.count("slack_observation_events", event_params),
            "latest": latest_event,
        },
        "import": {
            "database_status_counts": {
                status: sum(row.get("status") == status for row in mapping_jobs)
                for status in ("succeeded", "failed", "retry", "queued", "processing")
            },
            "atlas_terminal_counts": logical_counts,
            "false_successes": len(false_successes),
            "failed_jobs": len(failed_jobs),
            "failed_jobs_last_48h": len(recent_failed_jobs),
            "failure_samples": [
                {
                    "id": row.get("id"),
                    "created_at": row.get("created_at"),
                    "attempts": row.get("attempts"),
                    "last_error": row.get("last_error"),
                }
                for row in failed_jobs[:5]
            ],
            "success_samples": [
                {
                    "id": row.get("id"),
                    "created_at": row.get("created_at"),
                    "terminal_summary": terminal_summary(row.get("result")),
                }
                for row in succeeded_jobs[:5]
            ],
            "cursor": mapping.get("last_message_ts"),
            "last_synced_at": mapping.get("last_synced_at"),
        },
        "brain": {
            "slack_memories": memory_count,
            "embedded_memories": embedded_count,
            "embedding_coverage": round(embedded_count / memory_count, 4)
            if memory_count
            else None,
            "latest": latest_memory,
        },
    }


def probe_retrieval(
    client: RestClient,
    brain_id: str,
    query: str,
    api_key: str,
    expected: str | None,
) -> dict[str, Any]:
    embedding = embed_query(query, api_key)
    results = client.rpc(
        "search_ns_memories",
        {
            "p_brain_id": brain_id,
            "p_query_embedding": embedding,
            "p_match_threshold": 0,
            "p_match_count": 10,
            "p_min_significance": 0,
            "p_include_historical": True,
        },
    ) or []
    expected_lower = expected.lower() if expected else None
    hit = (
        any(expected_lower in str(row.get("content", "")).lower() for row in results)
        if expected_lower
        else bool(results)
    )
    return {
        "query": query,
        "expected": expected,
        "passed": hit,
        "result_count": len(results),
        "top_results": [
            {
                "id": row.get("id"),
                "similarity": row.get("similarity"),
                "source_id": row.get("source_id"),
                "content": str(row.get("content", ""))[:240],
            }
            for row in results[:5]
        ],
    }


def probe_lexical_retrieval(
    client: RestClient, brain_id: str, query: str, expected: str | None
) -> dict[str, Any]:
    results = client.rpc(
        "search_ns_memories_lexical",
        {
            "p_brain_id": brain_id,
            "p_query": query,
            "p_limit": 10,
            "p_include_historical": True,
        },
    ) or []
    expected_lower = expected.lower() if expected else None
    hit = (
        any(expected_lower in str(row.get("content", "")).lower() for row in results)
        if expected_lower
        else bool(results)
    )
    return {
        "lane": "lexical",
        "query": query,
        "expected": expected,
        "passed": hit,
        "result_count": len(results),
        "top_results": [
            {
                "id": row.get("id"),
                "source_id": row.get("source_id"),
                "content": str(row.get("content", ""))[:240],
            }
            for row in results[:5]
        ],
    }


def recover_poisoned_jobs(
    client: RestClient,
    jobs: list[dict[str, Any]],
    active_keys: set[str],
    limit: int,
    apply: bool,
) -> dict[str, Any]:
    eligible = select_recovery_candidates(jobs, active_keys, limit)
    candidates = [
        {
            "id": str(row["id"]),
            "dedupe_key": str(row["dedupe_key"]),
            "period_start_ts": (row.get("payload") or {}).get("periodStartTs"),
            "period_end_ts": (row.get("payload") or {}).get("periodEndTs"),
        }
        for row in eligible
    ]
    applied: list[str] = []
    skipped_conflict: list[str] = []
    if apply:
        for row in eligible:
            job_id = str(row["id"])
            try:
                updated = client.patch(
                    "brain_import_jobs",
                    {"id": f"eq.{job_id}", "status": "eq.succeeded"},
                    {
                        "status": "retry",
                        "attempts": 0,
                        "next_attempt_at": datetime.now(timezone.utc).isoformat(),
                        "last_error": "Recovery replay after fail-closed Campaign Brain importer deployment",
                        "result": None,
                        "started_at": None,
                        "completed_at": None,
                        "notified_at": None,
                        "chunks_total": None,
                        "chunks_completed": 0,
                    },
                )
            except urllib.error.HTTPError as error:
                if error.code != 409:
                    raise
                skipped_conflict.append(job_id)
                continue
            if updated:
                applied.append(job_id)
            else:
                skipped_conflict.append(job_id)
    return {
        "mode": "applied" if apply else "dry_run",
        "eligible": len(candidates),
        "candidates": candidates,
        "applied_job_ids": applied,
        "skipped_conflict_job_ids": skipped_conflict,
    }


def select_recovery_candidates(
    jobs: list[dict[str, Any]], active_keys: set[str], limit: int
) -> list[dict[str, Any]]:
    poisoned = [
        row
        for row in sorted(
            jobs, key=lambda item: str(item.get("created_at", "")), reverse=True
        )
        if row.get("status") == "succeeded"
        and logical_terminal_status(row.get("result")) in {"failed", "missing"}
        and str(row.get("dedupe_key")) not in active_keys
    ]
    selected: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for row in poisoned:
        identity = (str(row.get("user_id", "")), str(row.get("dedupe_key", "")))
        if identity in seen:
            continue
        seen.add(identity)
        selected.append(row)
        if len(selected) == limit:
            break
    return sorted(selected, key=lambda item: str(item.get("created_at", "")))


def health_failures(report: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    for mapping in report["mappings"]:
        label = f"{mapping['channel']} ({mapping['mapping_id']})"
        capture = mapping["capture"]
        imported = mapping["import"]
        brain = mapping["brain"]
        if not mapping["brain_id"]:
            failures.append(f"{label}: no Campaign Brain")
        if capture["observations"] == 0:
            failures.append(f"{label}: no captured Slack observations")
        if not imported["cursor"]:
            failures.append(f"{label}: no import cursor")
        if imported["false_successes"]:
            failures.append(f"{label}: falsely successful imports remain")
        if imported["failed_jobs_last_48h"]:
            failures.append(f"{label}: imports failed in the last 48 hours")
        if capture["observations"] and not brain["slack_memories"]:
            failures.append(f"{label}: captured Slack has no Campaign Brain memories")
        if brain["slack_memories"] and brain["embedding_coverage"] != 1:
            failures.append(f"{label}: Slack Brain memories are missing embeddings")
    probe = report.get("retrieval_probe")
    if probe and not probe["passed"]:
        failures.append("semantic retrieval probe did not return the expected evidence")
    return failures


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mapping-id", action="append", default=[])
    parser.add_argument("--org-id")
    parser.add_argument("--days", type=int, default=14)
    parser.add_argument("--probe-query")
    parser.add_argument("--lexical-query")
    parser.add_argument("--expect")
    parser.add_argument("--repair-poisoned", action="store_true")
    parser.add_argument("--repair-limit", type=int, default=25)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--fixed-runtime-deployed", action="store_true")
    parser.add_argument("--require-healthy", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.days < 1 or args.repair_limit < 1:
        raise SystemExit("--days and --repair-limit must be positive")
    if args.apply and not args.repair_poisoned:
        raise SystemExit("--apply is only valid with --repair-poisoned")
    if args.apply and not args.fixed_runtime_deployed:
        raise SystemExit("Refusing repair until --fixed-runtime-deployed is asserted")
    env = {**load_env(DEFAULT_ENV), **os.environ}
    base, key = require_production_credentials(env)
    client = RestClient(base, key)
    mappings = fetch_mappings(client, args.mapping_id, args.org_id)
    if not mappings:
        raise SystemExit("No matching Campaign Brain Slack mappings found")
    cutoff = (datetime.now(timezone.utc) - timedelta(days=args.days)).isoformat()
    jobs = fetch_jobs(client, {str(row["id"]) for row in mappings}, cutoff)
    report: dict[str, Any] = {
        "project": EXPECTED_PROJECT,
        "window_days": args.days,
        "mappings": [build_mapping_report(client, mapping, jobs) for mapping in mappings],
    }
    if args.probe_query or args.lexical_query:
        if len(mappings) != 1:
            raise SystemExit("retrieval probes require exactly one --mapping-id")
        brain_id = report["mappings"][0]["brain_id"]
        if not brain_id:
            raise SystemExit("Retrieval probe requires a resolved Campaign Brain")
    if args.probe_query:
        api_key = env.get("GEMINI_API_KEY", "")
        if not api_key:
            raise SystemExit("Semantic retrieval probe requires GEMINI_API_KEY")
        report["retrieval_probe"] = probe_retrieval(
            client, brain_id, args.probe_query, api_key, args.expect
        )
    if args.lexical_query:
        report["retrieval_probe"] = probe_lexical_retrieval(
            client, brain_id, args.lexical_query, args.expect
        )
    if args.repair_poisoned:
        active_keys = fetch_active_dedupe_keys(
            client, {str(row["id"]) for row in mappings}
        )
        report["recovery"] = recover_poisoned_jobs(
            client, jobs, active_keys, args.repair_limit, args.apply
        )
    failures = health_failures(report)
    report["health"] = {"passed": not failures, "failures": failures}
    print(json.dumps(report, indent=2))
    return 1 if args.require_healthy and failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
