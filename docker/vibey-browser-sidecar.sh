#!/usr/bin/env bash
set -euo pipefail

CONF="${VIBEY_SQUID_CONF:-/etc/squid/squid-instagram.conf}"
CDP_PORT="${VIBEY_BROWSER_CDP_PORT:-18800}"

squid -k kill -f "${CONF}" 2>/dev/null || true
squid -z -f "${CONF}" 2>/dev/null || true
squid -f "${CONF}"

cleanup() {
  squid -k shutdown -f "${CONF}" 2>/dev/null || true
}
trap cleanup EXIT

export DISPLAY=:99
Xvfb :99 -screen 0 1280x800x24 -ac -nolisten tcp &

sleep 1

exec /usr/bin/chromium \
  --headless=new \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="${CDP_PORT}" \
  --proxy-server=http://127.0.0.1:3128 \
  about:blank
