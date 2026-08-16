#!/usr/bin/env python3
"""Live verification: Slack channel → Portal client stamps for Pixel scenarios."""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / "apps" / "api" / ".env"


def load_env(path: Path) -> None:
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            # Skip multiline private keys accidentally
            if "BEGIN" in value or "\n" in value:
                continue
            os.environ[key] = value


load_env(ENV_PATH)
URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not URL or not KEY:
    sys.exit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")


def get(path: str, params: str):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}?{params}",
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Prefer": "count=exact",
        },
    )
    with urllib.request.urlopen(req, timeout=45) as res:
        return json.loads(res.read().decode()), res.headers.get("content-range")


EXPECTED = [
    ("roas-yasir-khan-coaching-ltd-955", "Yasir Khan Coaching LTD"),
    ("roas-impact-elite-coaching-820", "Impact Elite Coaching"),
    ("roas-christian-osgood", "Christian Osgood"),
    ("roas-insurancecreators-nicksakha", "Sakha"),
    ("roas-dunamismedia", "Dunamis"),
    ("roas-above-it-432", "Above It"),
    ("roas-1ds-collective-llc-939", "1DS Collective"),
    ("roas-leapingstone-wpfholdings", "Wpf holdings"),
    ("roas-standardplumbing-jacobreese", "Standard Plumbing"),
    ("roas-tradelaunch-justingeorgopoulos", "Trade Launch"),
    ("roas-master-your-kraft-llc-622", "Master Your Kraft"),
]

SCENARIOS = [
    ("S01", "Service Request redesign", "roas-yasir-khan-coaching-ltd-955", True),
    ("S02", "Forwarded client message → task", "roas-yasir-khan-coaching-ltd-955", True),
    ("S03", "Funnel fulfillment", "roas-impact-elite-coaching-820", True),
    ("S04", "Campaign status update", "roas-christian-osgood", True),
    ("S05", "Open request updates", "roas-insurancecreators-nicksakha", True),
    ("S06", "Ads Service Request", "roas-dunamismedia", True),
    ("S07", "Meta performance ask", "roas-above-it-432", True),
    ("S08", "Design request", "roas-1ds-collective-llc-939", True),
    ("S09", "Meeting follow-up tasks", "roas-leapingstone-wpfholdings", True),
    ("S10", "Copy request", "roas-standardplumbing-jacobreese", True),
    ("S11", "Video request", "roas-tradelaunch-justingeorgopoulos", True),
    ("S12", "GHL automation request", "roas-master-your-kraft-llc-622", True),
    ("S13", "Internal ops (ads-launches) no stamp", "ads-launches", False),
    ("S14", "Name-only Yasir channel hint", "roas-yasir-khan-coaching-ltd-955", True),
    ("S15", "Explicit override still has channel stamp", "roas-yasir-khan-coaching-ltd-955", True),
]


def latest_stamp(channel_name: str):
    encoded = urllib.parse.quote(channel_name)
    rows, _ = get(
        "slack_observation_events",
        f"select=channel_id,channel_name,metadata,org_id,slack_team_id,observed_at"
        f"&channel_name=eq.{encoded}"
        f"&metadata->>page_grader_client_id=not.is.null"
        f"&order=observed_at.desc&limit=1",
    )
    return rows[0] if rows else None


def main():
    results = []
    mapping_ok = 0
    for channel_name, client_needle in EXPECTED:
        row = latest_stamp(channel_name)
        if not row:
            results.append(
                {
                    "check": "mapping",
                    "channel": channel_name,
                    "ok": False,
                    "detail": "no page_grader stamp found",
                }
            )
            continue
        md = row.get("metadata") or {}
        name = md.get("page_grader_client_name") or ""
        ok = client_needle.lower() in name.lower() and bool(md.get("page_grader_client_id"))
        mapping_ok += int(ok)
        results.append(
            {
                "check": "mapping",
                "channel": channel_name,
                "ok": ok,
                "client": name,
                "client_id": md.get("page_grader_client_id"),
                "campaign": md.get("roas_campaign_name"),
                "channel_id": row.get("channel_id"),
            }
        )

    scenario_ok = 0
    for sid, title, channel_name, expect_stamp in SCENARIOS:
        if channel_name == "ads-launches":
            row = latest_stamp(channel_name)
            ok = row is None  # internal ops should not have portal client stamp
            detail = "no portal stamp (expected)" if ok else f"unexpected stamp {row}"
        else:
            row = latest_stamp(channel_name)
            ok = row is not None and bool((row.get("metadata") or {}).get("page_grader_client_id"))
            detail = (
                f"stamp={(row or {}).get('metadata', {}).get('page_grader_client_name')}"
                if ok
                else "missing stamp"
            )
        if expect_stamp is False:
            # already handled ads-launches
            pass
        scenario_ok += int(ok)
        results.append(
            {
                "check": "scenario",
                "id": sid,
                "title": title,
                "channel": channel_name,
                "ok": ok,
                "detail": detail,
            }
        )

    summary = {
        "mappings_expected": len(EXPECTED),
        "mappings_ok": mapping_ok,
        "scenarios_expected": len(SCENARIOS),
        "scenarios_ok": scenario_ok,
        "all_ok": mapping_ok == len(EXPECTED) and scenario_ok == len(SCENARIOS),
        "results": results,
    }
    print(json.dumps(summary, indent=2))
    sys.exit(0 if summary["all_ok"] else 1)


if __name__ == "__main__":
    main()
