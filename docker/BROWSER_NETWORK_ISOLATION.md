# Browser sidecar network isolation (verification)

## Expected behavior

1. **Boot state**: `browser-sidecar` does not autostart; `supervisorctl status browser-sidecar` should show it stopped until explicitly started.
2. **CDP before start**: `curl -sS http://127.0.0.1:18800/json/version` should fail before the sidecar is started.
3. **CDP after start**: after `supervisorctl start browser-sidecar`, Chromium exposes DevTools only on `127.0.0.1:18800` (not on Fly’s public interface).
4. **Squid after start**: Squid listens on `127.0.0.1:3128`; allowlist is Instagram-related domains only (see `squid-instagram.conf`).
5. **Chromium after start**: Chromium starts with `--proxy-server=http://127.0.0.1:3128` so HTTP(S) egress goes through Squid.
6. **OpenClaw**: `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: false` blocks private/internal host navigation at DNS resolution.
7. **Navigation guard** (OpenClaw): Non-`http:`/`https:` schemes (e.g. `file:`, `data:`, `javascript:`) are rejected before `page.goto`.

## Manual checks (container shell)

- `supervisorctl status browser-sidecar` shows the sidecar stopped after machine boot.
- `curl -sS http://127.0.0.1:18800/json/version` fails before the sidecar is started.
- `supervisorctl start browser-sidecar`, then `curl -sS http://127.0.0.1:18800/json/version` returns JSON.
- Attempting to use the proxy for a non-allowed host should fail (e.g. blocked by Squid).

---

Only `http_service` (agent-api) should publish a public port; browser CDP and Squid are loopback-only in this setup.
