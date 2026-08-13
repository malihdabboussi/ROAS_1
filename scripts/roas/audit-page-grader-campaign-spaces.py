#!/usr/bin/env python3
"""Read-only audit for Page Grader client -> ROAS campaign Space reconciliation."""

from __future__ import annotations

import argparse
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

EXPECTED_HOST = "lhfgtsjetcardinpgouq"
DEFAULT_ENV = Path(os.environ.get("ROAS_SECRETS_FILE", Path(__file__).with_name("roas-secrets.env")))


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


def rest_get(base: str, key: str, table: str, params: dict[str, str]) -> list[dict]:
    query = urllib.parse.urlencode(params, safe="(),.*")
    request = urllib.request.Request(
        f"{base.rstrip('/')}/rest/v1/{table}?{query}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", action="append", default=[], help="Only show matching client name")
    parser.add_argument("--require", type=int, default=0, help="Fail unless this many clients have campaign Spaces")
    args = parser.parse_args()

    env = {**load_env(DEFAULT_ENV), **os.environ}
    base = env.get("SUPABASE_URL", "")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if EXPECTED_HOST not in base or not key:
        raise SystemExit("Refusing to run without the ROAS production URL and service-role key")

    integrations = rest_get(
        base,
        key,
        "user_integrations",
        {
            "integration_id": "eq.page_grader",
            "status": "eq.connected",
            "select": "user_id,org_id,metadata",
        },
    )
    mappings: list[dict] = []
    for integration in integrations:
        scope_map = (integration.get("metadata") or {}).get("client_scope_map") or {}
        for client_id, entry in scope_map.items():
            if (entry and entry.get("campaign_id")):
                mappings.append({"client_id": client_id, "entry": entry})

    campaign_ids = sorted({row["entry"]["campaign_id"] for row in mappings})
    campaigns = (
        rest_get(
            base,
            key,
            "campaigns",
            {"id": f"in.({','.join(campaign_ids)})", "select": "id,name,org_id,deleted_at"},
        )
        if campaign_ids
        else []
    )
    spaces = (
        rest_get(
            base,
            key,
            "spaces",
            {"campaign_id": f"in.({','.join(campaign_ids)})", "select": "id,campaign_id,title,schema"},
        )
        if campaign_ids
        else []
    )
    campaign_by_id = {row["id"]: row for row in campaigns}
    spaces_by_campaign: dict[str, list[dict]] = {}
    for space in spaces:
        spaces_by_campaign.setdefault(space["campaign_id"], []).append(space)

    requested = {name.strip().lower() for name in args.name if name.strip()}
    rows = []
    for mapping in mappings:
        entry = mapping["entry"]
        campaign = campaign_by_id.get(entry["campaign_id"], {})
        name = campaign.get("name") or entry.get("campaign_name") or "Unknown"
        if requested and name.strip().lower() not in requested:
            continue
        child_spaces = []
        for space in spaces_by_campaign.get(entry["campaign_id"], []):
            custom = ((space.get("schema") or {}).get("custom_data") or {})
            if custom.get("space_role") == "client_campaign":
                child_spaces.append(
                    {
                        "id": space["id"],
                        "title": space["title"],
                        "page_grader_campaign_id": custom.get("page_grader_campaign_id"),
                        "meta_ad_account_id": (custom.get("meta") or {}).get("ad_account_id"),
                        "meta_campaign_id": (custom.get("meta") or {}).get("meta_campaign_id"),
                    }
                )
        rows.append(
            {
                "name": name,
                "page_grader_client_id": mapping["client_id"],
                "roas_campaign_id": entry["campaign_id"],
                "campaign_space_hash": entry.get("campaign_space_hash"),
                "campaign_spaces": child_spaces,
            }
        )

    reconciled = sum(bool(row["campaign_spaces"]) for row in rows)
    print(json.dumps({"mapped": len(rows), "reconciled": reconciled, "clients": rows}, indent=2))
    if args.require and reconciled < args.require:
        print(f"FAIL: required {args.require} reconciled clients, found {reconciled}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
