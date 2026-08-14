#!/usr/bin/env bash
set -euo pipefail

CDP_PORT="${VIBEY_BROWSER_CDP_PORT:-18800}"

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
  about:blank
