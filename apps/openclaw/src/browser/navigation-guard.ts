import type { BrowserConfig } from "../config/types.browser.js";
import type { LookupFn, PinnedHostname, SsrFPolicy } from "../infra/net/ssrf.js";
import { resolvePinnedHostnameWithPolicy } from "../infra/net/ssrf.js";

/**
 * Blocks non-http(s) schemes (e.g. file:, data:, javascript:) before Playwright navigation.
 * Aligns with GHSA-45cg-2683-gfmq-style URL scheme restrictions.
 */
export function assertAllowedBrowserNavigationUrl(rawUrl: string): void {
  const trimmed = String(rawUrl ?? "").trim();
  if (!trimmed) {
    throw new Error("url is required");
  }
  if (trimmed.toLowerCase() === "about:blank") {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Blocked navigation scheme: ${parsed.protocol.replace(":", "")} (only http(s) and about:blank allowed)`,
    );
  }
}

export function browserSsrfPolicyFromBrowserConfig(
  cfg: BrowserConfig | undefined,
): SsrFPolicy | undefined {
  const raw = cfg?.ssrfPolicy;
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  if (raw.dangerouslyAllowPrivateNetwork === true) {
    return { allowPrivateNetwork: true };
  }
  return { allowPrivateNetwork: false };
}

export async function assertBrowserNavigationPassesSsrf(
  rawUrl: string,
  policy: SsrFPolicy | undefined,
  options: { lookupFn?: LookupFn } = {},
): Promise<PinnedHostname | null> {
  const trimmed = String(rawUrl ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "about:blank") {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  const host = parsed.hostname;
  if (!host) {
    throw new Error("Invalid URL: missing hostname");
  }
  return await resolvePinnedHostnameWithPolicy(host, { policy, lookupFn: options.lookupFn });
}

export async function assertBrowserCommittedNavigationPassesSsrf(
  _initialUrl: string,
  committedUrl: string,
  policy: SsrFPolicy | undefined,
  options: { lookupFn?: LookupFn } = {},
): Promise<PinnedHostname | null> {
  const trimmed = String(committedUrl ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "about:blank") {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol === "chrome-error:" || parsed.protocol === "about:") {
    return null;
  }
  assertAllowedBrowserNavigationUrl(trimmed);
  return await assertBrowserNavigationPassesSsrf(trimmed, policy, options);
}

export async function assertBrowserOpenTabUrlAllowed(
  rawUrl: string,
  ssrfPolicy: SsrFPolicy | undefined,
): Promise<void> {
  assertAllowedBrowserNavigationUrl(rawUrl);
  await assertBrowserNavigationPassesSsrf(rawUrl, ssrfPolicy);
}
