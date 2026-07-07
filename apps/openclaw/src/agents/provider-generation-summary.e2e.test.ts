import { describe, expect, it } from "vitest";
import {
  buildProviderGenerationFromAssistant,
  providerGenerationIds,
  sumProviderGenerationCosts,
} from "./provider-generation-summary.js";

describe("provider generation summaries", () => {
  it("extracts OpenRouter generation IDs and sums complete provider costs", () => {
    const first = buildProviderGenerationFromAssistant(
      {
        role: "assistant",
        providerResponseId: "gen-first",
        provider: "openrouter",
        model: "anthropic/claude-opus-4.6",
        usage: { input: 10, output: 20, cost: { total: 1.25 } },
      } as never,
      { input: 10, output: 20, total: 30 },
    );
    const second = buildProviderGenerationFromAssistant(
      {
        role: "assistant",
        id: "gen-second",
        provider: "openrouter",
        model: "anthropic/claude-opus-4.6",
        usage: { input: 30, output: 40, total_cost: 2.5 },
      } as never,
      { input: 30, output: 40, total: 70 },
    );

    const generations = [first, second].filter((value): value is NonNullable<typeof value> =>
      Boolean(value),
    );

    expect(providerGenerationIds(generations)).toEqual(["gen-first", "gen-second"]);
    expect(sumProviderGenerationCosts(generations)).toBe(3.75);
  });

  it("does not invent a partial sum when a generation cost is missing", () => {
    expect(
      sumProviderGenerationCosts([
        { generationId: "gen-first", providerCost: 1.25 },
        { generationId: "gen-second" },
      ]),
    ).toBeUndefined();
  });
});
