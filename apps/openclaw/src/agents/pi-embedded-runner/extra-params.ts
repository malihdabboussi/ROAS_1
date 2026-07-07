import type { StreamFn } from "@mariozechner/pi-agent-core";
import type { SimpleStreamOptions } from "@mariozechner/pi-ai";
import { streamSimple } from "@mariozechner/pi-ai";
import type { OpenClawConfig } from "../../config/config.js";
import { log } from "./logger.js";

const OPENROUTER_APP_HEADERS: Record<string, string> = {
  "HTTP-Referer": "https://openclaw.ai",
  "X-Title": "OpenClaw",
};
// NOTE: We only force `store=true` for *direct* OpenAI Responses.
// Codex responses (chatgpt.com/backend-api/codex/responses) require `store=false`.
const OPENAI_RESPONSES_APIS = new Set(["openai-responses"]);
const OPENAI_RESPONSES_PROVIDERS = new Set(["openai"]);

/**
 * Resolve provider-specific extra params from model config.
 * Used to pass through stream params like temperature/maxTokens.
 *
 * @internal Exported for testing only
 */
export function resolveExtraParams(params: {
  cfg: OpenClawConfig | undefined;
  provider: string;
  modelId: string;
}): Record<string, unknown> | undefined {
  const modelKey = `${params.provider}/${params.modelId}`;
  const modelConfig = params.cfg?.agents?.defaults?.models?.[modelKey];
  return modelConfig?.params ? { ...modelConfig.params } : undefined;
}

type CacheRetention = "none" | "short" | "long";
type CacheRetentionStreamOptions = Partial<SimpleStreamOptions> & {
  cacheRetention?: CacheRetention;
};
type ResponseMetadataStreamOptions = Partial<SimpleStreamOptions> & {
  onResponseMetadata?: (metadata: Record<string, unknown>) => void;
};

export type OpenRouterProviderStartedMetadata = {
  provider: "openrouter";
  providerGenerationId?: string;
  providerRequestId?: string;
  responseId?: string;
  metadata: Record<string, unknown>;
};

function isOpenRouterAnthropicModel(provider: string, modelId: string): boolean {
  return provider === "openrouter" && modelId.startsWith("anthropic/");
}

/**
 * Resolve cacheRetention from extraParams, supporting both new `cacheRetention`
 * and legacy `cacheControlTtl` values for backwards compatibility.
 *
 * Mapping: "5m" → "short", "1h" → "long"
 *
 * Applies to:
 *   - direct `anthropic` provider (consumed by pi-ai stream option, native Anthropic API)
 *   - `openrouter` provider with `anthropic/*` model id (consumed by the OpenRouter
 *     cache_control wrapper below — injected as a top-level field per OpenRouter spec)
 */
function resolveCacheRetention(
  extraParams: Record<string, unknown> | undefined,
  provider: string,
  modelId: string,
): CacheRetention | undefined {
  if (provider !== "anthropic" && !isOpenRouterAnthropicModel(provider, modelId)) {
    return undefined;
  }

  // Prefer new cacheRetention if present
  const newVal = extraParams?.cacheRetention;
  if (newVal === "none" || newVal === "short" || newVal === "long") {
    return newVal;
  }

  // Fall back to legacy cacheControlTtl with mapping
  const legacy = extraParams?.cacheControlTtl;
  if (legacy === "5m") {
    return "short";
  }
  if (legacy === "1h") {
    return "long";
  }
  return undefined;
}

function createStreamFnWithExtraParams(
  baseStreamFn: StreamFn | undefined,
  extraParams: Record<string, unknown> | undefined,
  provider: string,
  modelId: string,
): StreamFn | undefined {
  if (!extraParams || Object.keys(extraParams).length === 0) {
    return undefined;
  }

  const streamParams: CacheRetentionStreamOptions = {};
  if (typeof extraParams.temperature === "number") {
    streamParams.temperature = extraParams.temperature;
  }
  if (typeof extraParams.maxTokens === "number") {
    streamParams.maxTokens = extraParams.maxTokens;
  }
  // pi-ai consumes `cacheRetention` only on the direct Anthropic provider path.
  // For OpenRouter→Anthropic we inject `cache_control` into the request body via
  // createOpenRouterCacheControlWrapper instead, so we skip it here.
  if (provider === "anthropic") {
    const cacheRetention = resolveCacheRetention(extraParams, provider, modelId);
    if (cacheRetention) {
      streamParams.cacheRetention = cacheRetention;
    }
  }

  if (Object.keys(streamParams).length === 0) {
    return undefined;
  }

  log.debug(`creating streamFn wrapper with params: ${JSON.stringify(streamParams)}`);

  const underlying = baseStreamFn ?? streamSimple;
  const wrappedStreamFn: StreamFn = (model, context, options) =>
    underlying(model, context, {
      ...streamParams,
      ...options,
    });

  return wrappedStreamFn;
}

function isDirectOpenAIBaseUrl(baseUrl: unknown): boolean {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    return true;
  }

  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === "api.openai.com" || host === "chatgpt.com";
  } catch {
    const normalized = baseUrl.toLowerCase();
    return normalized.includes("api.openai.com") || normalized.includes("chatgpt.com");
  }
}

function shouldForceResponsesStore(model: {
  api?: unknown;
  provider?: unknown;
  baseUrl?: unknown;
}): boolean {
  if (typeof model.api !== "string" || typeof model.provider !== "string") {
    return false;
  }
  if (!OPENAI_RESPONSES_APIS.has(model.api)) {
    return false;
  }
  if (!OPENAI_RESPONSES_PROVIDERS.has(model.provider)) {
    return false;
  }
  return isDirectOpenAIBaseUrl(model.baseUrl);
}

function createOpenAIResponsesStoreWrapper(baseStreamFn: StreamFn | undefined): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) => {
    if (!shouldForceResponsesStore(model)) {
      return underlying(model, context, options);
    }

    const originalOnPayload = options?.onPayload;
    return underlying(model, context, {
      ...options,
      onPayload: (payload) => {
        if (payload && typeof payload === "object") {
          (payload as { store?: unknown }).store = true;
        }
        originalOnPayload?.(payload);
      },
    });
  };
}

/**
 * Create a streamFn wrapper that adds OpenRouter app attribution headers.
 * These headers allow OpenClaw to appear on OpenRouter's leaderboard.
 */
function createOpenRouterHeadersWrapper(baseStreamFn: StreamFn | undefined): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) =>
    underlying(model, context, {
      ...options,
      headers: {
        ...OPENROUTER_APP_HEADERS,
        ...options?.headers,
      },
    });
}

function createOpenRouterBillingStartedWrapper(
  baseStreamFn: StreamFn | undefined,
  onProviderStarted: (metadata: OpenRouterProviderStartedMetadata) => void,
): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) => {
    const nextOptions = options as ResponseMetadataStreamOptions | undefined;
    const originalOnResponseMetadata = nextOptions?.onResponseMetadata;
    return underlying(model, context, {
      ...options,
      onResponseMetadata: (metadata: Record<string, unknown>) => {
        originalOnResponseMetadata?.(metadata);
        onProviderStarted({
          provider: "openrouter",
          providerGenerationId: readMetadataString(metadata, [
            "providerGenerationId",
            "provider_generation_id",
            "generationId",
            "id",
          ]),
          providerRequestId: readMetadataString(metadata, [
            "providerRequestId",
            "provider_request_id",
            "requestId",
          ]),
          responseId: readMetadataString(metadata, ["responseId", "response_id"]),
          metadata,
        });
      },
    } as SimpleStreamOptions);
  };
}

function readMetadataString(
  metadata: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeNestedCacheControlTtl(value: unknown, ttl: "1h" | undefined): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      normalizeNestedCacheControlTtl(item, ttl);
    }
    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }

  const cacheControl = asRecord(record.cache_control);
  if (cacheControl) {
    if (ttl) {
      cacheControl.ttl = ttl;
    } else {
      delete cacheControl.ttl;
    }
  }

  for (const child of Object.values(record)) {
    normalizeNestedCacheControlTtl(child, ttl);
  }
}

function resolveOpenRouterRouting(
  extraParams: Record<string, unknown> | undefined,
  provider: string,
): Record<string, unknown> | undefined {
  if (provider !== "openrouter") {
    return undefined;
  }
  return asRecord(extraParams?.openRouterRouting);
}

/**
 * Inject OpenRouter provider routing object into outgoing chat payload.
 * This allows pinning upstream provider selection for cache affinity.
 */
function createOpenRouterRoutingWrapper(
  baseStreamFn: StreamFn | undefined,
  routing: Record<string, unknown>,
): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) => {
    const originalOnPayload = options?.onPayload;
    return underlying(model, context, {
      ...options,
      onPayload: (payload) => {
        const payloadRecord = asRecord(payload);
        if (payloadRecord) {
          const existing = asRecord(payloadRecord.provider);
          payloadRecord.provider = existing ? { ...existing, ...routing } : { ...routing };
        }
        originalOnPayload?.(payload);
      },
    });
  };
}

/**
 * Inject top-level `cache_control` into the outgoing OpenRouter chat payload so
 * Anthropic prompt caching activates for `openrouter/anthropic/*` models.
 *
 * Per OpenRouter spec (https://openrouter.ai/docs/guides/best-practices/prompt-caching):
 *   - Top-level `cache_control` instructs OpenRouter to manage the cache breakpoint
 *     across multi-turn conversations and tool loops automatically.
 *   - When set, the request is routed exclusively to the Anthropic provider.
 *   - `ttl` omitted ⇒ default 5m (short); `ttl: "1h"` ⇒ extended (long).
 *
 * Direct Anthropic (provider === "anthropic") uses pi-ai's `cacheRetention` stream
 * option instead — handled in createStreamFnWithExtraParams.
 */
function createOpenRouterCacheControlWrapper(
  baseStreamFn: StreamFn | undefined,
  cacheRetention: Exclude<CacheRetention, "none">,
): StreamFn {
  const underlying = baseStreamFn ?? streamSimple;
  return (model, context, options) => {
    const originalOnPayload = options?.onPayload;
    return underlying(model, context, {
      ...options,
      onPayload: (payload) => {
        const payloadRecord = asRecord(payload);
        if (payloadRecord) {
          const ttl = cacheRetention === "long" ? "1h" : undefined;
          if (payloadRecord.cache_control === undefined) {
            payloadRecord.cache_control = ttl ? { type: "ephemeral", ttl } : { type: "ephemeral" };
          }
          const topLevelCacheControl = asRecord(payloadRecord.cache_control);
          const topLevelTtl = topLevelCacheControl?.ttl === "1h" ? "1h" : undefined;
          normalizeNestedCacheControlTtl(payloadRecord.messages, topLevelTtl);
        }
        originalOnPayload?.(payload);
      },
    });
  };
}

/**
 * Apply extra params (like temperature) to an agent's streamFn.
 * Also adds OpenRouter app attribution headers when using the OpenRouter provider.
 *
 * @internal Exported for testing
 */
export function applyExtraParamsToAgent(
  agent: { streamFn?: StreamFn },
  cfg: OpenClawConfig | undefined,
  provider: string,
  modelId: string,
  extraParamsOverride?: Record<string, unknown>,
  onProviderStarted?: (metadata: OpenRouterProviderStartedMetadata) => void,
): void {
  const extraParams = resolveExtraParams({
    cfg,
    provider,
    modelId,
  });
  const override =
    extraParamsOverride && Object.keys(extraParamsOverride).length > 0
      ? Object.fromEntries(
          Object.entries(extraParamsOverride).filter(([, value]) => value !== undefined),
        )
      : undefined;
  const merged = Object.assign({}, extraParams, override);
  const wrappedStreamFn = createStreamFnWithExtraParams(agent.streamFn, merged, provider, modelId);

  if (wrappedStreamFn) {
    log.debug(`applying extraParams to agent streamFn for ${provider}/${modelId}`);
    agent.streamFn = wrappedStreamFn;
  }

  if (provider === "openrouter") {
    log.debug(`applying OpenRouter app attribution headers for ${provider}/${modelId}`);
    agent.streamFn = createOpenRouterHeadersWrapper(agent.streamFn);
    if (onProviderStarted) {
      agent.streamFn = createOpenRouterBillingStartedWrapper(agent.streamFn, onProviderStarted);
    }
    const routing = resolveOpenRouterRouting(merged, provider);
    if (routing) {
      log.debug(`applying OpenRouter provider routing for ${provider}/${modelId}`);
      agent.streamFn = createOpenRouterRoutingWrapper(agent.streamFn, routing);
    }
    if (isOpenRouterAnthropicModel(provider, modelId)) {
      const cacheRetention = resolveCacheRetention(merged, provider, modelId);
      if (cacheRetention && cacheRetention !== "none") {
        log.debug(
          `applying OpenRouter cache_control (${cacheRetention}) for ${provider}/${modelId}`,
        );
        agent.streamFn = createOpenRouterCacheControlWrapper(agent.streamFn, cacheRetention);
      }
    }
  }

  // Work around upstream pi-ai hardcoding `store: false` for Responses API.
  // Force `store=true` for direct OpenAI/OpenAI Codex providers so multi-turn
  // server-side conversation state is preserved.
  agent.streamFn = createOpenAIResponsesStoreWrapper(agent.streamFn);
}
