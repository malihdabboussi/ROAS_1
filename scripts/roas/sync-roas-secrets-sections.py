#!/usr/bin/env python3
"""Sync roas-secrets.env sections 6–10 from master sections 1–5."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SECRETS = ROOT / 'scripts/roas/roas-secrets.env'


def parse_line(line: str):
    if not line or line.startswith('#') or '=' not in line:
        return None
    key, _, value = line.partition('=')
    return key.strip(), value


def parse_value(raw: str):
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in '"\'':
        return raw[1:-1], raw
    return raw, raw


def fmt(name: str, val: str, master_raw: dict[str, str]) -> str:
    raw = master_raw.get(name, val)
    if ' ' in val and not (raw.strip().startswith('"') and raw.strip().endswith('"')):
        return f'{name}="{val}"'
    return f'{name}={raw if raw else val}'


def main() -> int:
    if not SECRETS.exists():
        print(f'Missing {SECRETS}', file=sys.stderr)
        return 1

    lines = SECRETS.read_text().splitlines()
    master: dict[str, str] = {}
    master_raw: dict[str, str] = {}
    in_master = True
    for line in lines:
        if line.startswith('# 6. VERCEL roas-api'):
            in_master = False
        if not in_master:
            continue
        parsed = parse_line(line)
        if not parsed:
            continue
        val, raw = parse_value(parsed[1])
        master[parsed[0]] = val
        master_raw[parsed[0]] = raw

    if master.get('SUPABASE_ANON_KEY'):
        master['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = master['SUPABASE_ANON_KEY']
        master_raw['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = master_raw['SUPABASE_ANON_KEY']
    if master.get('SUPABASE_URL'):
        master['NEXT_PUBLIC_SUPABASE_URL'] = master['SUPABASE_URL']
        master_raw['NEXT_PUBLIC_SUPABASE_URL'] = master_raw['SUPABASE_URL']
    if master.get('API_URL'):
        master['MAIN_API_URL'] = master['API_URL']
        master_raw['MAIN_API_URL'] = master_raw['API_URL']
        master['MISSION_CALLBACK_URL'] = master['API_URL']
        master_raw['MISSION_CALLBACK_URL'] = master_raw['API_URL']
    if master.get('AGENT_API_URL'):
        master['AGENT_BACKEND_URL'] = master['AGENT_API_URL']
        master_raw['AGENT_BACKEND_URL'] = master_raw['AGENT_API_URL']

    static_defaults = {
        'PORT': {'6': '3001', '9': '3003', '10': '3005'},
        'MACHINE_POOL_REPLENISH_ENABLED': {'6': 'true'},
        'MACHINE_POOL_SIZE': {'6': '3'},
        'MACHINE_IDLE_THRESHOLD_MS': {'6': '900000'},
        'MACHINE_STALE_THRESHOLD_DAYS': {'6': '30'},
        'FLY_MACHINE_HOURLY_RATE': {'6': '0.0226'},
        'NEXT_PUBLIC_MCP_CONSENT_PATH': {'7': '/mcp/consent'},
        'NEXT_PUBLIC_WAITLIST_MODE': {'7': 'false'},
        'NEXT_PUBLIC_REQUIRE_ADMIN': {'7': 'false'},
        'ALLOW_FREE_ONBOARDING': {'6': 'true'},
        'NEXT_PUBLIC_ALLOW_FREE_ONBOARDING': {'7': 'true'},
        'OPENCLAW_AGENT_ID': {'9': 'main'},
        'OPENCLAW_MODEL_PREFIX': {'10': 'openclaw'},
        'MISSIONS_BATCH_SIZE': {'10': '20'},
        'MISSIONS_EXECUTION_TIMEOUT_MS': {'10': '1800000'},
        'REDIS_URL': {'10': '${{Redis.REDIS_URL}}'},
    }

    api_vars = [
        'PORT', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET',
        'APP_URL', 'API_URL', 'CORS_ORIGIN', 'PLATFORM_API_URL',
        'MCP_OAUTH_ISSUER_URL', 'MCP_RESOURCE_URL', 'MCP_WEB_CONSENT_URL',
        'VAULT_ENCRYPTION_KEY', 'INTERNAL_API_TOKEN', 'OPENCLAW_GATEWAY_TOKEN',
        'VERCEL_TOKEN', 'VERCEL_FUNNELS_PROJECT_ID', 'VERCEL_TEAM_ID', 'FLY_API_TOKEN',
        'REDIS_URL', 'OPENCLAW_GATEWAY_URL', 'AGENT_API_URL',
        'OPENROUTER_API_KEY', 'COMPOSIO_API_KEY', 'COMPOSIO_BASE_URL',
        'SENDGRID_API_KEY', 'FIRECRAWL_API_KEY', 'GEMINI_API_KEY',
        'SCRAPECREATORS_API_KEY', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD',
        'SEARCHAPI_API_KEY',
        'MACHINE_POOL_REPLENISH_ENABLED', 'MACHINE_POOL_SIZE', 'MACHINE_IDLE_THRESHOLD_MS',
        'MACHINE_STALE_THRESHOLD_DAYS', 'FLY_MACHINE_HOURLY_RATE',
        'ALLOW_FREE_ONBOARDING',
    ]
    web_vars = [
        'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'BACKEND_URL',
        'NEXT_PUBLIC_BACKEND_URL', 'AGENT_BACKEND_URL', 'NEXT_PUBLIC_MCP_CONSENT_PATH',
        'NEXT_PUBLIC_WAITLIST_MODE', 'NEXT_PUBLIC_REQUIRE_ADMIN', 'NEXT_PUBLIC_ALLOW_FREE_ONBOARDING',
    ]
    funnels_vars = [
        'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
        'BACKEND_URL', 'CLOUDFLARE_BASE_DOMAIN',
    ]
    fly_vars = [
        'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
        'VAULT_ENCRYPTION_KEY', 'OPENCLAW_GATEWAY_URL', 'OPENCLAW_GATEWAY_TOKEN',
        'MAIN_API_URL', 'INTERNAL_API_TOKEN', 'GEMINI_API_KEY', 'COMPOSIO_API_KEY',
        'OPENROUTER_API_KEY', 'BRAVE_API_KEY', 'PERPLEXITY_API_KEY',
        'CORS_ORIGIN', 'PORT', 'OPENCLAW_AGENT_ID',
    ]
    railway_vars = [
        'REDIS_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
        'OPENCLAW_GATEWAY_URL', 'OPENCLAW_GATEWAY_TOKEN', 'INTERNAL_API_TOKEN',
        'BACKEND_URL', 'MISSION_CALLBACK_URL', 'OPENCLAW_MODEL_PREFIX',
        'MISSIONS_BATCH_SIZE', 'MISSIONS_EXECUTION_TIMEOUT_MS', 'PORT',
        'COMPOSIO_API_KEY',
    ]

    text = SECRETS.read_text()
    parts = re.split(r'(^# ={5,}\n# 6\. VERCEL roas-api.*)', text, maxsplit=1, flags=re.M)
    if len(parts) < 3:
        print('Could not find section 6', file=sys.stderr)
        return 1
    head, _, tail = parts[0], parts[1], parts[2]
    tail_parts = re.split(r'(^# ={5,}\n# 11\. LOCAL DEV.*)', tail, maxsplit=1, flags=re.M)
    section_tail = tail_parts[1] + tail_parts[2] if len(tail_parts) > 2 else ''

    def emit(header: str, var_list: list[str], section_key: str) -> str:
        out = [header, '']
        for name in var_list:
            section_static = static_defaults.get(name, {}).get(section_key)
            if section_static is not None and section_static != '':
                out.append(f'{name}={section_static}')
                continue
            val = master.get(name, '')
            out.append(fmt(name, val, master_raw) if val else f'{name}=')
        out.append('')
        return '\n'.join(out)

    new_body = (
        head.rstrip()
        + '\n\n\n'
        + emit(
            '# =============================================================================\n'
            '# 6. VERCEL roas-api ONLY — paste this whole section into Vercel roas-api → Production\n'
            '# =============================================================================\n'
            '# Self-contained paste block — synced from sections 1–5',
            api_vars,
            '6',
        )
        + '\n'
        + emit(
            '# =============================================================================\n'
            '# 7. VERCEL roas-web ONLY — paste this whole section into Vercel roas-web → Production\n'
            '# =============================================================================',
            web_vars,
            '7',
        )
        + '\n'
        + emit(
            '# =============================================================================\n'
            '# 8. VERCEL roas-funnels ONLY — paste this whole section into Vercel roas-funnels → Production\n'
            '# =============================================================================',
            funnels_vars,
            '8',
        )
        + '\n'
        + emit(
            '# =============================================================================\n'
            '# 9. FLY roas-runtimes — paste into Fly Secrets\n'
            '# =============================================================================',
            fly_vars,
            '9',
        )
        + '\n'
        + emit(
            '# =============================================================================\n'
            '# 10. RAILWAY roas-workers — PASTE BLOCK (mission-worker + queue-worker)\n'
            '# =============================================================================\n'
            '# WHERE: Railway → roas-workers → service → Variables → Raw Editor\n'
            '# Paste KEY=VALUE lines below into BOTH mission-worker AND queue-worker.\n'
            '# REDIS_URL must be internal — use ${{Redis.REDIS_URL}} (rename Redis if needed).\n'
            '# Do NOT use public .proxy.rlwy.net URL (that is for Vercel roas-api only).\n'
            '# COMPOSIO_API_KEY required by queue-worker at boot; include on both services.',
            railway_vars,
            '10',
        )
        + section_tail.lstrip('\n')
    )

    SECRETS.write_text(new_body)
    print(f'Synced sections 6–10 in {SECRETS}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
