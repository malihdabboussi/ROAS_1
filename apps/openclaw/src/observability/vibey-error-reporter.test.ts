import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatOpenClawErrorPayload,
  resolveVibeyObservabilityConfig,
  sendOpenClawErrorReport,
} from "./vibey-error-reporter.js";

describe("resolveVibeyObservabilityConfig", () => {
  it("returns null when endpoint or token is missing", () => {
    expect(resolveVibeyObservabilityConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(
      resolveVibeyObservabilityConfig({
        VIBEY_OBSERVABILITY_URL: "https://api.test/openclaw-error",
      } as NodeJS.ProcessEnv),
    ).toBeNull();
  });

  it("resolves endpoint, token, and timeout", () => {
    expect(
      resolveVibeyObservabilityConfig({
        VIBEY_OBSERVABILITY_URL: "https://api.test/openclaw-error",
        VIBEY_OBSERVABILITY_TOKEN: "token",
        VIBEY_OBSERVABILITY_TIMEOUT_MS: "2500",
      } as NodeJS.ProcessEnv),
    ).toEqual({
      url: "https://api.test/openclaw-error",
      token: "token",
      timeoutMs: 2500,
    });
  });
});

describe("formatOpenClawErrorPayload", () => {
  it("formats errors with stack and runtime context", () => {
    const error = new Error("boom");
    const payload = formatOpenClawErrorPayload({
      feature: "gateway",
      errorCode: "OPENCLAW_TEST",
      error,
      severity: "critical",
      context: { route: "/v1/responses" },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        severity: "critical",
        feature: "gateway",
        error_code: "OPENCLAW_TEST",
        message: "boom",
        stack: expect.stringContaining("boom"),
        context: expect.objectContaining({
          route: "/v1/responses",
          pid: process.pid,
        }),
      }),
    );
  });
});

describe("sendOpenClawErrorReport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to the configured internal endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendOpenClawErrorReport(
        {
          feature: "gateway",
          errorCode: "OPENCLAW_SEND_TEST",
          message: "send test",
        },
        {
          url: "https://agent-api.test/api/internal/observability/openclaw-error",
          token: "internal-token",
          timeoutMs: 1000,
        },
      ),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://agent-api.test/api/internal/observability/openclaw-error",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": "internal-token",
        },
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(
      expect.objectContaining({
        feature: "gateway",
        error_code: "OPENCLAW_SEND_TEST",
        message: "send test",
      }),
    );
  });
});
