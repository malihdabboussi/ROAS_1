import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type RuntimeConfig = {
  agents?: {
    defaults?: {
      bootstrapTotalMaxChars?: number;
      contextTokens?: number;
      contextPruning?: {
        ttl?: string;
        keepLastAssistants?: number;
        minPrunableToolChars?: number;
      };
      model?: { primary?: string; fallbacks?: string[] };
      models?: Record<string, { params?: { cacheRetention?: string } }>;
    };
  };
};

function loadRuntimeConfig(): RuntimeConfig {
  const configPath = path.resolve(import.meta.dirname, "../../../../docker/openclaw.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as RuntimeConfig;
}

describe("production runtime cost guardrails", () => {
  it("keeps the quality default on Sonnet while reserving Opus as a fallback", () => {
    const model = loadRuntimeConfig().agents?.defaults?.model;

    expect(model?.primary).toBe("openrouter/anthropic/claude-sonnet-4.6");
    expect(model?.fallbacks).toContain("openrouter/anthropic/claude-opus-4.6");
  });

  it("caps context growth and prunes stale tool results", () => {
    const defaults = loadRuntimeConfig().agents?.defaults;

    expect(defaults?.contextTokens).toBe(65_536);
    expect(defaults?.bootstrapTotalMaxChars).toBeLessThanOrEqual(24_000);
    expect(defaults?.contextPruning).toMatchObject({
      ttl: "5m",
      keepLastAssistants: 2,
      minPrunableToolChars: 8_000,
    });
  });

  it("uses short-lived Anthropic prompt caches so pruning can run after five minutes", () => {
    const models = loadRuntimeConfig().agents?.defaults?.models ?? {};
    const anthropicModels = Object.entries(models).filter(([model]) =>
      model.startsWith("openrouter/anthropic/"),
    );

    expect(anthropicModels.length).toBeGreaterThan(0);
    for (const [, config] of anthropicModels) {
      expect(config.params?.cacheRetention).toBe("short");
    }
  });
});
