# Browser sidecar (verification)

The sidecar is the agent-controlled Chromium that Pixel uses to click through live funnels, fill test leads, and review confirmation pages. Designer/Lux visual review uses the same browser.

## Expected behavior

1. **Boot state**: `browser-sidecar` autostarts. `supervisorctl status browser-sidecar` should show it running after machine boot.
2. **CDP after start**: Chromium exposes DevTools only on `127.0.0.1:18800` (not on Fly’s public interface).
3. **Public pages**: Chromium reaches public `http`/`https` sites so a live funnel such as a client registration page can be opened, filled, and submitted.
4. **OpenClaw**: `browser.enabled` is `true`. `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: false` still blocks private/internal host navigation at DNS resolution.
5. **Navigation guard** (OpenClaw): Non-`http:`/`https:` schemes (e.g. `file:`, `data:`, `javascript:`) are rejected before `page.goto`.
6. **Control server**: The OpenClaw browser control server must be running (`OPENCLAW_SKIP_BROWSER_CONTROL_SERVER` is unset) so `browser` act/snapshot/navigate work against the sidecar CDP.

The previous Instagram-only Squid proxy is not used. That allowlist blocked live funnel hosts, so click-through QC could not reach a Register Now page. `docker/squid-instagram.conf` remains in the image for an optional future Instagram-only profile.

## Manual checks (container shell)

- `supervisorctl status browser-sidecar` shows the sidecar running after machine boot.
- `curl -sS http://127.0.0.1:18800/json/version` returns JSON.
- Navigating Chromium to a public funnel host succeeds; navigating to a private/internal host is rejected by OpenClaw SSRF.

---

Only `http_service` (agent-api) should publish a public port; browser CDP stays loopback-only in this setup.
