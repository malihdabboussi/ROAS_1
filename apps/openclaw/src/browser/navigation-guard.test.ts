import { describe, expect, it } from "vitest";
import {
  assertAllowedBrowserNavigationUrl,
  assertBrowserCommittedNavigationPassesSsrf,
  assertBrowserNavigationPassesSsrf,
  browserSsrfPolicyFromBrowserConfig,
} from "./navigation-guard.js";

describe("navigation-guard", () => {
  it("allows http, https, and about:blank", () => {
    expect(() => assertAllowedBrowserNavigationUrl("https://instagram.com/")).not.toThrow();
    expect(() => assertAllowedBrowserNavigationUrl("http://example.com/")).not.toThrow();
    expect(() => assertAllowedBrowserNavigationUrl("about:blank")).not.toThrow();
    expect(() => assertAllowedBrowserNavigationUrl("ABOUT:BLANK")).not.toThrow();
  });

  it("blocks file, data, and javascript schemes", () => {
    expect(() => assertAllowedBrowserNavigationUrl("file:///etc/passwd")).toThrow(
      /Blocked navigation scheme/i,
    );
    expect(() => assertAllowedBrowserNavigationUrl("data:text/html,<script>")).toThrow(
      /Blocked navigation scheme/i,
    );
    expect(() => assertAllowedBrowserNavigationUrl("javascript:alert(1)")).toThrow(
      /Blocked navigation scheme/i,
    );
  });

  it("maps ssrf policy from config", () => {
    expect(browserSsrfPolicyFromBrowserConfig(undefined)).toBeUndefined();
    expect(browserSsrfPolicyFromBrowserConfig({ ssrfPolicy: {} })?.allowPrivateNetwork).toBe(false);
    expect(
      browserSsrfPolicyFromBrowserConfig({ ssrfPolicy: { dangerouslyAllowPrivateNetwork: false } })
        ?.allowPrivateNetwork,
    ).toBe(false);
    expect(
      browserSsrfPolicyFromBrowserConfig({ ssrfPolicy: { dangerouslyAllowPrivateNetwork: true } })
        ?.allowPrivateNetwork,
    ).toBe(true);
  });

  it("returns pinned resolution metadata for browser navigations", async () => {
    const lookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

    const pinned = await assertBrowserNavigationPassesSsrf(
      "https://example.com/",
      { allowPrivateNetwork: false },
      { lookupFn },
    );

    expect(pinned?.hostname).toBe("example.com");
    expect(pinned?.addresses).toEqual(["93.184.216.34"]);
  });

  it("re-checks committed browser URLs so redirects to private hosts are blocked", async () => {
    const lookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

    await expect(
      assertBrowserCommittedNavigationPassesSsrf(
        "https://example.com/",
        "http://127.0.0.1/admin",
        { allowPrivateNetwork: false },
        { lookupFn },
      ),
    ).rejects.toThrow(/private|internal|blocked/i);
  });
});
