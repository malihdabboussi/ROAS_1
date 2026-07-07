import { describe, expect, it, vi } from "vitest";

const { ProxyAgent, undiciFetch, proxyAgentSpy, getLastAgent } = vi.hoisted(() => {
  const undiciFetchAt4 = vi.fn();
  const proxyAgentSpyAt5 = vi.fn();
  class ProxyAgentAt6 {
    static lastCreated: ProxyAgentAt6 | undefined;
    proxyUrl: string;
    constructor(proxyUrl: string) {
      this.proxyUrl = proxyUrl;
      ProxyAgentAt6.lastCreated = this;
      proxyAgentSpyAt5(proxyUrl);
    }
  }

  return {
    ProxyAgentAt6: ProxyAgent,
    undiciFetch: undiciFetchAt4,
    proxyAgentSpy: proxyAgentSpyAt5,
    getLastAgent: () => ProxyAgentAt6.lastCreated,
  };
});

vi.mock("undici", () => ({
  ProxyAgent,
  fetch: undiciFetch,
}));

import { makeProxyFetch } from "./proxy.js";

describe("makeProxyFetch", () => {
  it("uses undici fetch with ProxyAgent dispatcher", async () => {
    const proxyUrl = "http://proxy.test:8080";
    undiciFetch.mockResolvedValue({ ok: true });

    const proxyFetch = makeProxyFetch(proxyUrl);
    await proxyFetch("https://api.telegram.org/bot123/getMe");

    expect(proxyAgentSpy).toHaveBeenCalledWith(proxyUrl);
    expect(undiciFetch).toHaveBeenCalledWith(
      "https://api.telegram.org/bot123/getMe",
      expect.objectContaining({ dispatcher: getLastAgent() }),
    );
  });
});
