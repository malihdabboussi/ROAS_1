import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type RuntimeConfig = {
  models?: {
    providers?: {
      openrouter?: {
        models?: Array<{ id?: string }>;
      };
    };
  };
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
  it("keeps the runtime default on discounted Terra with Sonnet fallback", () => {
    const model = loadRuntimeConfig().agents?.defaults?.model;

    expect(model?.primary).toBe("openrouter/openai/gpt-5.6-terra");
    expect(model?.fallbacks?.[0]).toBe("openrouter/anthropic/claude-sonnet-4.6");
    expect(model?.fallbacks).not.toContain("openrouter/anthropic/claude-opus-5");
  });

  it("caps context growth and prunes stale tool results", () => {
    const defaults = loadRuntimeConfig().agents?.defaults;

    expect(defaults?.contextTokens).toBe(250_000);
    expect(defaults?.bootstrapTotalMaxChars).toBe(30_000);
    expect(defaults?.contextPruning).toMatchObject({
      ttl: "5m",
      keepLastAssistants: 2,
      minPrunableToolChars: 8_000,
    });
  });

  it("registers production and experimental benchmark models without defaulting to experiments", () => {
    const config = loadRuntimeConfig();
    const modelIds =
      config.models?.providers?.openrouter?.models?.map((model) => model.id) ?? [];
    const primary = config.agents?.defaults?.model?.primary;

    expect(modelIds).toEqual(
      expect.arrayContaining([
        "anthropic/claude-opus-5",
        "anthropic/claude-fable-5",
        "anthropic/claude-sonnet-5",
        "anthropic/claude-sonnet-4.6",
        "openai/gpt-5.6-sol",
        "openai/gpt-5.6-terra",
      ]),
    );
    expect(primary).not.toContain("claude-sonnet-5");
    expect(primary).not.toContain("gpt-5.6-sol");
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
