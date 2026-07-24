#!/usr/bin/env python3
"""One-time: clone personal Meetings (+ Fathom automation) into ROAS org General;
move CEO HQ + Sales Pipeline into org General; disable personal Fathom Meeting Log.

Usage:
  python3 scripts/roas/clone-personal-spaces-to-org.py            # execute
  python3 scripts/roas/clone-personal-spaces-to-org.py --dry-run  # print plan only
"""

from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
import uuid
from pathlib import Path

SECRETS = Path(__file__).resolve().parent / "roas-secrets.env"

USER = "5f2b4597-31c2-4169-aa4e-3ef31523555c"
ORG = "f69bd799-3509-41b4-aaef-98f03c48c295"
ORG_GENERAL = "b2a8e2b2-90a0-4a38-8b64-2c5a6c91962e"

PERSONAL_MEETINGS = "d957d348-c30a-4dbb-a089-ba3092332543"
PERSONAL_CEO_HQ = "ab45102d-26c6-4a87-8fd3-424f2ef900b6"
PERSONAL_SALES = "e36a0c8c-92eb-4e0c-b209-c28f3a96e3b4"
PERSONAL_FATHOM_AUTO = "6d05fd66-8df3-45d7-9c61-65c1ec0c6ad0"
FATHOM_INTEGRATION = "9d699699-2af1-4c65-9d67-b6be95f39ca2"

CUSTOM_DATA_ITEM_KEYS = (
    "source_call_item_id",
    "source_meeting_item_id",
    "prep_doc_item_id",
    "source_item_id",
)


def load_secrets() -> dict[str, str]:
    wanted: dict[str, str] = {}
    for line in SECRETS.read_text().splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") and v and k not in wanted:
            wanted[k] = v
    if "SUPABASE_URL" not in wanted or "SUPABASE_SERVICE_ROLE_KEY" not in wanted:
        raise SystemExit("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in roas-secrets.env")
    return wanted


class Rest:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key

    def _headers(self, prefer: str | None = None) -> dict[str, str]:
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    def get(self, path: str, params: str):
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{path}?{params}",
            headers=self._headers("count=exact"),
        )
        with urllib.request.urlopen(req) as r:
            body = r.read().decode()
            return json.loads(body) if body else [], r.headers.get("content-range")

    def get_all(self, path: str, params: str) -> list:
        out: list = []
        offset = 0
        while True:
            rows, _ = self.get(path, f"{params}&limit=1000&offset={offset}")
            if not rows:
                break
            out.extend(rows)
            if len(rows) < 1000:
                break
            offset += 1000
        return out

    def post(self, path: str, payload, prefer: str = "return=representation"):
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{path}",
            data=data,
            headers=self._headers(prefer),
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as r:
                body = r.read().decode()
                return json.loads(body) if body else None
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"POST {path} failed: {e.read().decode()}") from e

    def patch(self, path: str, params: str, payload, prefer: str = "return=representation"):
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{path}?{params}",
            data=data,
            headers=self._headers(prefer),
            method="PATCH",
        )
        try:
            with urllib.request.urlopen(req) as r:
                body = r.read().decode()
                return json.loads(body) if body else None
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"PATCH {path}?{params} failed: {e.read().decode()}") from e


def strip_row(row: dict, *extra: str) -> dict:
    drop = {"id", "created_at", "updated_at", "share_token", *extra}
    return {k: v for k, v in row.items() if k not in drop}


def remap_custom_data(custom: object, id_map: dict[str, str]) -> object:
    if not isinstance(custom, dict):
        return custom
    out = dict(custom)
    for key in CUSTOM_DATA_ITEM_KEYS:
        val = out.get(key)
        if isinstance(val, str) and val in id_map:
            out[key] = id_map[val]
    return out


def clone_meetings(rest: Rest, dry_run: bool) -> str:
    existing, _ = rest.get(
        "spaces",
        f"select=id,title,campaign_id&org_id=eq.{ORG}&title=eq.Meetings&user_id=eq.{USER}",
    )
    if existing:
        print(f"ORG Meetings already exists: {existing[0]['id']} — skip clone")
        return str(existing[0]["id"])

    src_rows, _ = rest.get("spaces", f"select=*&id=eq.{PERSONAL_MEETINGS}")
    if not src_rows:
        raise SystemExit(f"Personal Meetings {PERSONAL_MEETINGS} not found")
    src = src_rows[0]
    items = rest.get_all("space_items", f"select=*&space_id=eq.{PERSONAL_MEETINGS}")
    autos = rest.get_all("space_automations", f"select=*&space_id=eq.{PERSONAL_MEETINGS}")
    print(
        f"Clone Meetings {PERSONAL_MEETINGS} → org General {ORG_GENERAL}: "
        f"{len(items)} items, {len(autos)} automations"
    )
    if dry_run:
        return "dry-run-meetings-id"

    new_space_id = str(uuid.uuid4())
    space_payload = strip_row(src, "share_link_enabled")
    space_payload.update(
        {
            "id": new_space_id,
            "org_id": ORG,
            "user_id": USER,
            "campaign_id": ORG_GENERAL,
            "title": "Meetings",
            "share_link_enabled": False,
            "share_token": None,
            "visibility": src.get("visibility") or "team",
        }
    )
    created = rest.post("spaces", space_payload)
    print(f"  created space {created[0]['id']}")

    id_map: dict[str, str] = {}
    insert_batch: list[dict] = []
    for item in items:
        old_id = str(item["id"])
        new_id = str(uuid.uuid4())
        id_map[old_id] = new_id
        copy = strip_row(item, "share_link_enabled")
        copy.update(
            {
                "id": new_id,
                "space_id": new_space_id,
                "org_id": ORG,
                "user_id": USER,
                "parent_item_id": None,
                "recurrence_parent_id": None,
                "share_link_enabled": False,
                "share_token": None,
                "custom_data": item.get("custom_data"),
            }
        )
        insert_batch.append(copy)

    # Insert in chunks
    CHUNK = 50
    for i in range(0, len(insert_batch), CHUNK):
        chunk = insert_batch[i : i + CHUNK]
        rest.post("space_items", chunk)
        print(f"  inserted items {i + 1}-{i + len(chunk)}/{len(insert_batch)}")

    # Remap parents + custom_data refs
    for item in items:
        old_id = str(item["id"])
        new_id = id_map[old_id]
        patch: dict = {}
        parent = item.get("parent_item_id")
        if parent and str(parent) in id_map:
            patch["parent_item_id"] = id_map[str(parent)]
        rec = item.get("recurrence_parent_id")
        if rec and str(rec) in id_map:
            patch["recurrence_parent_id"] = id_map[str(rec)]
        remapped = remap_custom_data(item.get("custom_data"), id_map)
        if remapped != item.get("custom_data"):
            patch["custom_data"] = remapped
        if patch:
            rest.patch("space_items", f"id=eq.{new_id}", patch, prefer="return=minimal")
    print("  remapped parent_item_id / custom_data refs")

    for auto in autos:
        auto_payload = strip_row(auto)
        auto_payload.update(
            {
                "id": str(uuid.uuid4()),
                "space_id": new_space_id,
                "org_id": ORG,
                "user_id": USER,
                "created_by": USER,
                # Enable Fathom Meeting Log on org; keep other drafts as-is
                "enabled": bool(auto.get("enabled"))
                or (
                    str(auto.get("name") or "") == "Fathom Meeting Log"
                    and (auto.get("trigger") or {}).get("type")
                    == "external_fathom_recording_ready"
                ),
            }
        )
        # Always enable the Fathom Meeting Log clone
        if str(auto.get("name") or "") == "Fathom Meeting Log":
            auto_payload["enabled"] = True
            auto_payload["is_draft"] = False
        created_auto = rest.post("space_automations", auto_payload)
        print(
            f"  cloned automation {auto.get('name')!r} → {created_auto[0]['id']} "
            f"enabled={created_auto[0].get('enabled')}"
        )

    return new_space_id


def move_space(rest: Rest, space_id: str, title: str, dry_run: bool) -> None:
    rows, _ = rest.get("spaces", f"select=id,title,org_id,campaign_id&id=eq.{space_id}")
    if not rows:
        raise SystemExit(f"{title} {space_id} not found")
    space = rows[0]
    if space.get("org_id") == ORG and space.get("campaign_id") == ORG_GENERAL:
        print(f"{title} already on org General — skip")
        return
    print(
        f"Move {title} {space_id} → org General "
        f"(was org={space.get('org_id')} campaign={space.get('campaign_id')})"
    )
    if dry_run:
        return
    rest.patch(
        "spaces",
        f"id=eq.{space_id}",
        {"org_id": ORG, "campaign_id": ORG_GENERAL},
        prefer="return=minimal",
    )
    rest.patch(
        "space_items",
        f"space_id=eq.{space_id}",
        {"org_id": ORG},
        prefer="return=minimal",
    )
    rest.patch(
        "space_automations",
        f"space_id=eq.{space_id}",
        {"org_id": ORG},
        prefer="return=minimal",
    )
    print(f"  moved {title}")


def disable_personal_fathom(rest: Rest, dry_run: bool) -> None:
    print(f"Disable personal Fathom Meeting Log {PERSONAL_FATHOM_AUTO}")
    if dry_run:
        return
    rest.patch(
        "space_automations",
        f"id=eq.{PERSONAL_FATHOM_AUTO}",
        {"enabled": False},
        prefer="return=minimal",
    )


def set_fathom_billing_org(rest: Rest, dry_run: bool) -> None:
    rows, _ = rest.get("user_integrations", f"select=id,metadata&id=eq.{FATHOM_INTEGRATION}")
    if not rows:
        print("Fathom integration not found — skip billing update")
        return
    meta = dict(rows[0].get("metadata") or {})
    meta["auto_ingest"] = True
    meta["auto_ingest_billing_scope"] = "org"
    meta["auto_ingest_billing_org_id"] = ORG
    print(
        f"Set Fathom billing → org {ORG} "
        f"(triggered_for={meta.get('triggered_for')})"
    )
    if dry_run:
        return
    rest.patch(
        "user_integrations",
        f"id=eq.{FATHOM_INTEGRATION}",
        {"metadata": meta},
        prefer="return=minimal",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    secrets = load_secrets()
    rest = Rest(secrets["SUPABASE_URL"], secrets["SUPABASE_SERVICE_ROLE_KEY"])

    org_meetings = clone_meetings(rest, args.dry_run)
    move_space(rest, PERSONAL_CEO_HQ, "CEO HQ", args.dry_run)
    move_space(rest, PERSONAL_SALES, "Sales Pipeline", args.dry_run)
    disable_personal_fathom(rest, args.dry_run)
    set_fathom_billing_org(rest, args.dry_run)

    print("\n=== RESULT ===")
    print(f"Meetings personal → org: {PERSONAL_MEETINGS} → {org_meetings}")
    print(f"CEO HQ moved: {PERSONAL_CEO_HQ} → org General {ORG_GENERAL}")
    print(f"Sales Pipeline moved: {PERSONAL_SALES} → org General {ORG_GENERAL}")
    print("Personal Fathom Meeting Log: disabled")
    print(f"Fathom auto_ingest billing: org={ORG}")


if __name__ == "__main__":
    main()
