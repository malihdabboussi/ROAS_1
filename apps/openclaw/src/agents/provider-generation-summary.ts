import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { NormalizedUsage } from "./usage.js";

const OPENROUTER_GENERATION_ID_RE = /^gen[-_]/;

export type ProviderGenerationSummary = {
  generationId?: string;
  providerResponseId?: string;
  provider?: string;
  model?: string;
  usage?: NormalizedUsage;
  providerCost?: number;
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function resolveProviderResponseIdFromAssistant(
  assistant: Record<string, unknown> | undefined,
): string | undefined {
  const candidates = [
    assistant?.providerResponseId,
    assistant?.id,
    assistant?.responseId,
    assistant?.completionId,
  ];
  const generationId = candidates.find(
    (value): value is string =>
      typeof value === "string" && OPENROUTER_GENERATION_ID_RE.test(value),
  );
  if (generationId) {
    return generationId;
  }
  return typeof assistant?.providerResponseId === "string"
    ? assistant.providerResponseId
    : undefined;
}

export function resolveProviderCostFromAssistant(
  assistant: Record<string, unknown> | undefined,
): number | undefined {
  const directCost = finiteNumber(assistant?.providerCost);
  if (directCost !== undefined) {
    return directCost;
  }
  const usage =
    assistant?.usage && typeof assistant.usage === "object"
      ? (assistant.usage as Record<string, unknown>)
      : undefined;
  const usageCost = usage?.cost;
  const numericUsageCost = finiteNumber(usageCost);
  if (numericUsageCost !== undefined) {
    return numericUsageCost;
  }
  if (usageCost && typeof usageCost === "object") {
    const totalCost = finiteNumber((usageCost as Record<string, unknown>).total);
    if (totalCost !== undefined) {
      return totalCost;
    }
  }
  return finiteNumber(usage?.total_cost);
}

export function buildProviderGenerationFromAssistant(
  assistantMessage: AgentMessage,
  usage: NormalizedUsage | undefined,
): ProviderGenerationSummary | undefined {
  const assistant =
    assistantMessage && typeof assistantMessage === "object"
      ? (assistantMessage as unknown as Record<string, unknown>)
      : undefined;
  const providerResponseId = resolveProviderResponseIdFromAssistant(assistant);
  const providerCost = resolveProviderCostFromAssistant(assistant);
  const provider = typeof assistant?.provider === "string" ? assistant.provider : undefined;
  const model = typeof assistant?.model === "string" ? assistant.model : undefined;
  const generationId =
    providerResponseId && OPENROUTER_GENERATION_ID_RE.test(providerResponseId)
      ? providerResponseId
      : undefined;

  if (!providerResponseId && providerCost === undefined && !usage && !provider && !model) {
    return undefined;
  }

  return {
    generationId,
    providerResponseId,
    provider,
    model,
    usage,
    providerCost,
  };
}

export function providerGenerationIds(generations: ProviderGenerationSummary[]): string[] {
  return [
    ...new Set(
      generations
        .flatMap((generation) => [generation.generationId, generation.providerResponseId])
        .filter(
          (value): value is string =>
            typeof value === "string" && OPENROUTER_GENERATION_ID_RE.test(value),
        ),
    ),
  ];
}

export function sumProviderGenerationCosts(
  generations: ProviderGenerationSummary[],
): number | undefined {
  const costs = generations
    .map((generation) => finiteNumber(generation.providerCost))
    .filter((cost): cost is number => cost !== undefined);
  if (costs.length === 0 || costs.length !== generations.length) {
    return undefined;
  }
  return Number(costs.reduce((sum, cost) => sum + cost, 0).toFixed(8));
}
