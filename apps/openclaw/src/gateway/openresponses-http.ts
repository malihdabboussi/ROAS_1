/**
 * OpenResponses HTTP Handler
 *
 * Implements the OpenResponses `/v1/responses` endpoint for OpenClaw Gateway.
 *
 * @see https://www.open-responses.com/
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import * as Sentry from "@sentry/node";
import { randomUUID } from "node:crypto";
import type { ClientToolDefinition } from "../agents/pi-embedded-runner/run/params.js";
import type { ThinkLevel } from "../auto-reply/thinking.js";
import type { ImageContent } from "../commands/agent/types.js";
import type { SessionSystemPromptReport } from "../config/sessions/types.js";
import type { GatewayHttpResponsesConfig } from "../config/types.gateway.js";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { createDefaultDeps } from "../cli/deps.js";
import { agentCommand } from "../commands/agent.js";
import { emitAgentEvent, onAgentEvent } from "../infra/agent-events.js";
import { ensureSentryGatewayInit } from "../infra/sentry-gateway.js";
import { logInfo, logWarn } from "../logger.js";
import {
  DEFAULT_INPUT_FILE_MAX_BYTES,
  DEFAULT_INPUT_FILE_MAX_CHARS,
  DEFAULT_INPUT_FILE_MIMES,
  DEFAULT_INPUT_IMAGE_MAX_BYTES,
  DEFAULT_INPUT_IMAGE_MIMES,
  DEFAULT_INPUT_MAX_REDIRECTS,
  DEFAULT_INPUT_PDF_MAX_PAGES,
  DEFAULT_INPUT_PDF_MAX_PIXELS,
  DEFAULT_INPUT_PDF_MIN_TEXT_CHARS,
  DEFAULT_INPUT_TIMEOUT_MS,
  extractFileContentFromSource,
  extractImageContentFromSource,
  normalizeMimeList,
  type InputFileLimits,
  type InputImageLimits,
  type InputImageSource,
} from "../media/input-files.js";
import { defaultRuntime } from "../runtime.js";
import { resolveAssistantStreamDeltaText } from "./agent-event-assistant-text.js";
import { classifyOpenClawGatewayError } from "./gateway-error-classify.js";
import { sendJson, setSseHeaders, writeDone } from "./http-common.js";
import { handleGatewayPostJsonEndpoint } from "./http-endpoint-helpers.js";
import {
  getHeader,
  resolveAgentIdForRequest,
  resolveAgentIdFromModel,
  resolveSessionKey,
} from "./http-utils.js";
import {
  CreateResponseBodySchema,
  type ContentPart,
  type CreateResponseBody,
  type ItemParam,
  type OutputItem,
  type ResponseResource,
  type StreamingEvent,
  type Usage,
} from "./open-responses.schema.js";
import {
  findOpenResponsesLedgerEntry,
  recordOpenResponsesLedgerEntry,
} from "./openresponses-response-ledger.js";

type OpenResponsesHttpOptions = {
  auth: ResolvedGatewayAuth;
  maxBodyBytes?: number;
  config?: GatewayHttpResponsesConfig;
  trustedProxies?: string[];
  rateLimiter?: AuthRateLimiter;
};

const DEFAULT_BODY_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_URL_PARTS = 10;

function readOpenResponsesMetadata(payload: CreateResponseBody): {
  missionId: string;
  userId: string;
  agentKey: string;
} {
  const meta = payload.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return { missionId: "", userId: "", agentKey: "" };
  }
  const m = meta as Record<string, unknown>;
  return {
    missionId: typeof m.mission_id === "string" ? m.mission_id : "",
    userId: typeof m.user_id === "string" ? m.user_id : "",
    agentKey: typeof m.agent_key === "string" ? m.agent_key : "",
  };
}

const SENTRY_ATTR_MAX = 200_000;

function writeSseEvent(res: ServerResponse, event: StreamingEvent) {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

function resolveArtifactLifecycleFromToolStart(params: {
  toolName: string;
  args: unknown;
}): { kind: "funnel_page_tsx" | "lead_magnet_page_tsx"; label: string } | null {
  const name = params.toolName.trim().toLowerCase();
  if (name !== "write" && name !== "edit") {
    return null;
  }
  if (!params.args || typeof params.args !== "object") {
    return null;
  }
  const record = params.args as Record<string, unknown>;
  const rawPath = typeof record.path === "string" ? record.path : "";
  const normalized = rawPath.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() || "";
  if (!fileName.toLowerCase().endsWith(".tsx")) {
    return null;
  }
  if (normalized.includes("/funnel/pages/")) {
    return { kind: "funnel_page_tsx", label: `Generating funnel page: ${fileName}` };
  }
  if (normalized.includes("/lead-magnet/pages/")) {
    return { kind: "lead_magnet_page_tsx", label: `Generating lead magnet page: ${fileName}` };
  }
  return null;
}

function extractTextContent(content: string | ContentPart[]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((part) => {
      if (part.type === "input_text") {
        return part.text;
      }
      if (part.type === "output_text") {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

type ResolvedResponsesLimits = {
  maxBodyBytes: number;
  maxUrlParts: number;
  files: InputFileLimits;
  images: InputImageLimits;
};

function normalizeHostnameAllowlist(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  const normalized = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function resolveResponsesLimits(
  config: GatewayHttpResponsesConfig | undefined,
): ResolvedResponsesLimits {
  const files = config?.files;
  const images = config?.images;
  return {
    maxBodyBytes: config?.maxBodyBytes ?? DEFAULT_BODY_BYTES,
    maxUrlParts:
      typeof config?.maxUrlParts === "number"
        ? Math.max(0, Math.floor(config.maxUrlParts))
        : DEFAULT_MAX_URL_PARTS,
    files: {
      allowUrl: files?.allowUrl ?? true,
      urlAllowlist: normalizeHostnameAllowlist(files?.urlAllowlist),
      allowedMimes: normalizeMimeList(files?.allowedMimes, DEFAULT_INPUT_FILE_MIMES),
      maxBytes: files?.maxBytes ?? DEFAULT_INPUT_FILE_MAX_BYTES,
      maxChars: files?.maxChars ?? DEFAULT_INPUT_FILE_MAX_CHARS,
      maxRedirects: files?.maxRedirects ?? DEFAULT_INPUT_MAX_REDIRECTS,
      timeoutMs: files?.timeoutMs ?? DEFAULT_INPUT_TIMEOUT_MS,
      pdf: {
        maxPages: files?.pdf?.maxPages ?? DEFAULT_INPUT_PDF_MAX_PAGES,
        maxPixels: files?.pdf?.maxPixels ?? DEFAULT_INPUT_PDF_MAX_PIXELS,
        minTextChars: files?.pdf?.minTextChars ?? DEFAULT_INPUT_PDF_MIN_TEXT_CHARS,
      },
    },
    images: {
      allowUrl: images?.allowUrl ?? true,
      urlAllowlist: normalizeHostnameAllowlist(images?.urlAllowlist),
      allowedMimes: normalizeMimeList(images?.allowedMimes, DEFAULT_INPUT_IMAGE_MIMES),
      maxBytes: images?.maxBytes ?? DEFAULT_INPUT_IMAGE_MAX_BYTES,
      maxRedirects: images?.maxRedirects ?? DEFAULT_INPUT_MAX_REDIRECTS,
      timeoutMs: images?.timeoutMs ?? DEFAULT_INPUT_TIMEOUT_MS,
    },
  };
}

function extractClientTools(body: CreateResponseBody): ClientToolDefinition[] {
  return (body.tools ?? []) as ClientToolDefinition[];
}

function applyToolChoice(params: {
  tools: ClientToolDefinition[];
  toolChoice: CreateResponseBody["tool_choice"];
}): { tools: ClientToolDefinition[]; extraSystemPrompt?: string } {
  const { tools, toolChoice } = params;
  if (!toolChoice) {
    return { tools };
  }

  if (toolChoice === "none") {
    return { tools: [] };
  }

  if (toolChoice === "required") {
    if (tools.length === 0) {
      throw new Error("tool_choice=required but no tools were provided");
    }
    return {
      tools,
      extraSystemPrompt: "You must call one of the available tools before responding.",
    };
  }

  if (typeof toolChoice === "object" && toolChoice.type === "function") {
    const targetName = toolChoice.function?.name?.trim();
    if (!targetName) {
      throw new Error("tool_choice.function.name is required");
    }
    const matched = tools.filter((tool) => tool.function?.name === targetName);
    if (matched.length === 0) {
      throw new Error(`tool_choice requested unknown tool: ${targetName}`);
    }
    return {
      tools: matched,
      extraSystemPrompt: `You must call the ${targetName} tool before responding.`,
    };
  }

  return { tools };
}

export function buildAgentPrompt(input: string | ItemParam[]): {
  message: string;
  extraSystemPrompt?: string;
} {
  if (typeof input === "string") {
    return { message: input };
  }

  const systemParts: string[] = [];
  let userMessage = "";

  for (const item of input) {
    if (item.type === "message") {
      const content = extractTextContent(item.content).trim();
      if (!content) {
        continue;
      }

      if (item.role === "system" || item.role === "developer") {
        systemParts.push(content);
        continue;
      }

      // [CONTEXT] and [CONVERSATION_HISTORY] blocks from agent-api carry per-turn
      // dynamic context. Route them to extraSystemPrompt so they end up in the
      // system prompt, not baked into the user message.
      if (
        item.role === "user" &&
        (content.startsWith("[CONTEXT]") || content.startsWith("[CONVERSATION_HISTORY]"))
      ) {
        systemParts.push(content);
        continue;
      }

      // Skip synthetic acks from agent-api
      if (
        item.role === "assistant" &&
        (content === "Context received." ||
          content === "Conversation history restored. I have full context of our prior work.")
      ) {
        continue;
      }

      // The last user message is the actual prompt
      if (item.role === "user") {
        userMessage = content;
      }
    } else if (item.type === "function_call_output") {
      userMessage = item.output;
    }
  }

  return {
    message: userMessage,
    extraSystemPrompt: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
  };
}

function resolveOpenResponsesSessionKey(params: {
  req: IncomingMessage;
  agentId: string;
  user?: string | undefined;
}): string {
  return resolveSessionKey({ ...params, prefix: "openresponses" });
}

function createEmptyUsage(): Usage {
  return { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
}

function toUsage(
  value:
    | {
        input?: number;
        output?: number;
        cacheRead?: number;
        cacheWrite?: number;
        total?: number;
      }
    | undefined,
): Usage {
  if (!value) {
    return createEmptyUsage();
  }
  const input = value.input ?? 0;
  const output = value.output ?? 0;
  const cacheRead = value.cacheRead ?? 0;
  const cacheWrite = value.cacheWrite ?? 0;
  const total = value.total ?? input + output + cacheRead + cacheWrite;
  const usage: Usage = {
    input_tokens: Math.max(0, input),
    output_tokens: Math.max(0, output),
    total_tokens: Math.max(0, total),
  };
  if (cacheRead > 0) {
    usage.cache_read_input_tokens = cacheRead;
  }
  if (cacheWrite > 0) {
    usage.cache_creation_input_tokens = cacheWrite;
  }
  return usage;
}

function extractUsageFromResult(result: unknown): Usage {
  const meta = (result as { meta?: { agentMeta?: { usage?: unknown } } } | null)?.meta;
  const usage = meta && typeof meta === "object" ? meta.agentMeta?.usage : undefined;
  return toUsage(
    usage as
      | { input?: number; output?: number; cacheRead?: number; cacheWrite?: number; total?: number }
      | undefined,
  );
}

function mapOpenResponsesEffortToThinkLevel(effort: string | undefined): ThinkLevel | undefined {
  switch (effort) {
    case "none":
      return "off";
    case "minimal":
      return "minimal";
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "high";
    case "xhigh":
    case "max":
      return "xhigh";
    default:
      return undefined;
  }
}

function mapReasoningBudgetToThinkLevel(tokens: number | undefined): ThinkLevel | undefined {
  if (!tokens || tokens <= 0) {
    return undefined;
  }
  if (tokens <= 1_024) {
    return "minimal";
  }
  if (tokens <= 4_096) {
    return "low";
  }
  if (tokens <= 8_192) {
    return "medium";
  }
  if (tokens <= 16_384) {
    return "high";
  }
  return "xhigh";
}

function resolveRequestedThinkLevel(payload: CreateResponseBody): ThinkLevel | undefined {
  return (
    mapOpenResponsesEffortToThinkLevel(payload.verbosity) ??
    mapOpenResponsesEffortToThinkLevel(payload.reasoning?.effort) ??
    mapReasoningBudgetToThinkLevel(payload.reasoning?.max_tokens)
  );
}

function extractProviderResponseId(result: unknown): string | undefined {
  const meta = (result as { meta?: { agentMeta?: { providerResponseId?: string } } } | null)?.meta;
  return meta?.agentMeta?.providerResponseId || undefined;
}

function extractProviderCost(result: unknown): number | undefined {
  const meta = (result as { meta?: { agentMeta?: { providerCost?: number } } } | null)?.meta;
  const cost = meta?.agentMeta?.providerCost;
  return typeof cost === "number" ? cost : undefined;
}

function extractProviderGenerationIds(result: unknown): string[] {
  const meta = (result as { meta?: { agentMeta?: { providerGenerationIds?: unknown } } } | null)
    ?.meta;
  const ids = meta?.agentMeta?.providerGenerationIds;
  if (!Array.isArray(ids)) {
    return [];
  }
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

function extractProviderGenerations(result: unknown): unknown[] {
  const meta = (result as { meta?: { agentMeta?: { providerGenerations?: unknown } } } | null)
    ?.meta;
  const generations = meta?.agentMeta?.providerGenerations;
  return Array.isArray(generations)
    ? generations.filter((generation) => generation && typeof generation === "object")
    : [];
}

function extractResolvedProviderModel(result: unknown): string | undefined {
  const agentMeta = (
    result as {
      meta?: {
        agentMeta?: {
          provider?: string;
          model?: string;
        };
      };
    } | null
  )?.meta?.agentMeta;
  const model = typeof agentMeta?.model === "string" ? agentMeta.model.trim() : "";
  if (!model) {
    return undefined;
  }
  if (model.includes("/")) {
    return model;
  }
  const provider = typeof agentMeta?.provider === "string" ? agentMeta.provider.trim() : "";
  return provider ? `${provider}/${model}` : model;
}

function extractPayloadText(payloads: Array<{ text?: string }> | undefined): string {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    return "";
  }
  return payloads
    .map((payload) => (typeof payload.text === "string" ? payload.text : ""))
    .filter(Boolean)
    .join("\n\n");
}

function extractContextMeta(result: unknown): {
  lastCallInputTokens?: number;
  contextWindowTokens?: number;
  compactionCount?: number;
  systemPromptReport?: SessionSystemPromptReport;
} {
  const meta = (
    result as {
      meta?: {
        agentMeta?: {
          lastCallUsage?: { input?: number };
          contextWindowTokens?: number;
          compactionCount?: number;
        };
        systemPromptReport?: SessionSystemPromptReport;
      };
    } | null
  )?.meta;
  const am = meta?.agentMeta;
  if (!am) {
    return {};
  }
  return {
    lastCallInputTokens:
      typeof am.lastCallUsage?.input === "number" ? am.lastCallUsage.input : undefined,
    contextWindowTokens:
      typeof am.contextWindowTokens === "number" ? am.contextWindowTokens : undefined,
    compactionCount: typeof am.compactionCount === "number" ? am.compactionCount : undefined,
    systemPromptReport: meta?.systemPromptReport,
  };
}

function extractEmbeddedRunError(result: unknown): { kind: string; message: string } | undefined {
  const error = (
    result as {
      meta?: {
        error?: {
          kind?: unknown;
          message?: unknown;
        };
      };
    } | null
  )?.meta?.error;
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const kind = typeof error.kind === "string" ? error.kind : "";
  const message = typeof error.message === "string" ? error.message : "";
  if (!kind && !message) {
    return undefined;
  }
  return {
    kind: kind || "agent_error",
    message: message || "Agent failed",
  };
}

function mapEmbeddedRunErrorToResponseError(error: { kind: string; message: string }): {
  code: string;
  message: string;
  metadata: Record<string, unknown>;
} {
  if (error.kind === "context_overflow" || error.kind === "compaction_failure") {
    return {
      code: "context_window_exceeded",
      message: `context_window_exceeded: ${error.message}`,
      metadata: {
        retryable: true,
        error_class: error.kind,
      },
    };
  }
  return {
    code: error.kind || "agent_error",
    message: error.message,
    metadata: {
      retryable: false,
      error_class: error.kind || "agent_error",
    },
  };
}

function createResponseResource(params: {
  id: string;
  model: string;
  status: ResponseResource["status"];
  output: OutputItem[];
  usage?: Usage;
  error?: { code: string; message: string };
  metadata?: Record<string, unknown>;
  providerCost?: number;
  providerGenerationIds?: string[];
  providerGenerations?: unknown[];
}): ResponseResource {
  const metadata: Record<string, unknown> = { ...params.metadata };
  if (typeof params.providerCost === "number") {
    metadata.provider_cost = params.providerCost;
  }
  if (params.providerGenerationIds?.length) {
    metadata.provider_generation_ids = params.providerGenerationIds;
  }
  if (params.providerGenerations?.length) {
    metadata.provider_generations = params.providerGenerations;
  }
  if (
    typeof params.providerCost === "number" ||
    params.providerGenerationIds?.length ||
    params.providerGenerations?.length
  ) {
    metadata.provider_billing = "openrouter";
  }
  return {
    id: params.id,
    object: "response",
    created_at: Math.floor(Date.now() / 1000),
    status: params.status,
    model: params.model,
    output: params.output,
    usage: params.usage ?? createEmptyUsage(),
    error: params.error,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

function createAssistantOutputItem(params: {
  id: string;
  text: string;
  status?: "in_progress" | "completed";
}): OutputItem {
  return {
    type: "message",
    id: params.id,
    role: "assistant",
    content: [{ type: "output_text", text: params.text }],
    status: params.status,
  };
}

/** Collects trace stream events for a single OpenResponses run (non-streaming clients). */
type ResponsesTraceState = {
  system_prompt?: string;
  llm_input?: Record<string, unknown>;
  llm_output?: unknown;
};

function createResponsesTraceCollector(runId: string) {
  const state: ResponsesTraceState = {};
  const unsubscribe = onAgentEvent((evt) => {
    if (evt.runId !== runId || evt.stream !== "trace") {
      return;
    }
    const raw = evt.data;
    if (!raw || typeof raw !== "object") {
      return;
    }
    const d = raw;
    const t = d.type;
    if (t === "system_prompt" && typeof d.system_prompt === "string") {
      state.system_prompt = d.system_prompt;
      return;
    }
    if (t === "llm_input") {
      state.llm_input = {
        provider: d.provider,
        model: d.model,
        prompt: d.prompt,
        messages: d.messages,
        images_count: d.images_count,
      };
      return;
    }
    if (t === "llm_output") {
      state.llm_output = d.messages;
    }
  });
  return {
    read: (): ResponsesTraceState => state,
    unsubscribe,
  };
}

function buildVibeyTraceMetadata(trace: ResponsesTraceState): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  if (typeof trace.system_prompt === "string") {
    out.system_prompt = trace.system_prompt;
  }
  if (trace.llm_input) {
    out.llm_input = trace.llm_input;
  }
  if (trace.llm_output !== undefined) {
    out.llm_output = trace.llm_output;
  }
  if (Object.keys(out).length === 0) {
    return undefined;
  }
  try {
    JSON.stringify(out);
    return out;
  } catch {
    return typeof trace.system_prompt === "string"
      ? { system_prompt: trace.system_prompt, llm_trace_serialization_failed: true }
      : { llm_trace_serialization_failed: true };
  }
}

function mergeOpenResponsesMetadata(
  providerResponseId: string | undefined,
  providerGenerationIds: string[] | undefined,
  trace: ResponsesTraceState,
): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {};
  if (providerResponseId) {
    metadata.provider_response_id = providerResponseId;
  }
  if (providerGenerationIds?.length) {
    metadata.provider_generation_ids = providerGenerationIds;
  }
  const vibey = buildVibeyTraceMetadata(trace);
  if (vibey) {
    metadata.vibey_trace = vibey;
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

async function runResponsesAgentCommand(params: {
  message: string;
  images: ImageContent[];
  clientTools: ClientToolDefinition[];
  enabledToolkits?: string[];
  disabledNativeActions?: string[];
  skillCatalog?: CreateResponseBody["skill_catalog"];
  extraSystemPrompt: string;
  streamParams: { maxTokens: number } | undefined;
  thinkLevel?: ThinkLevel;
  contextTokensOverride?: number;
  sessionKey: string;
  lane?: string;
  runId: string;
  deps: ReturnType<typeof createDefaultDeps>;
  modelOverride?: string;
  runtimeCredentials?: CreateResponseBody["runtime_credentials"];
  abortSignal?: AbortSignal;
}) {
  const runtimeCredentials = params.runtimeCredentials?.map((credential) => ({
    provider: credential.provider,
    accessToken: credential.access_token,
  }));
  return agentCommand(
    {
      message: params.message,
      images: params.images.length > 0 ? params.images : undefined,
      clientTools: params.clientTools.length > 0 ? params.clientTools : undefined,
      enabledToolkits: params.enabledToolkits,
      disabledNativeActions: params.disabledNativeActions,
      skillCatalog: params.skillCatalog,
      extraSystemPrompt: params.extraSystemPrompt || undefined,
      streamParams: params.streamParams ?? undefined,
      thinking: params.thinkLevel,
      contextTokensOverride: params.contextTokensOverride,
      sessionKey: params.sessionKey,
      lane: params.lane,
      runId: params.runId,
      deliver: false,
      messageChannel: "webchat",
      bestEffortDeliver: false,
      modelOverride: params.modelOverride,
      runtimeCredentials,
      disableModelFallbacks: Boolean(runtimeCredentials?.length),
      reasoningLevel: "stream",
      abortSignal: params.abortSignal,
    },
    defaultRuntime,
    params.deps,
  );
}

export async function handleOpenResponsesHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: OpenResponsesHttpOptions,
): Promise<boolean> {
  const limits = resolveResponsesLimits(opts.config);
  const maxBodyBytes =
    opts.maxBodyBytes ??
    (opts.config?.maxBodyBytes
      ? limits.maxBodyBytes
      : Math.max(limits.maxBodyBytes, limits.files.maxBytes * 2, limits.images.maxBytes * 2));
  const handled = await handleGatewayPostJsonEndpoint(req, res, {
    pathname: "/v1/responses",
    auth: opts.auth,
    trustedProxies: opts.trustedProxies,
    rateLimiter: opts.rateLimiter,
    maxBodyBytes,
  });
  if (handled === false) {
    return false;
  }
  if (!handled) {
    return true;
  }

  // Validate request body with Zod
  const parseResult = CreateResponseBodySchema.safeParse(handled.body);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid request body";
    sendJson(res, 400, {
      error: { message, type: "invalid_request_error" },
    });
    return true;
  }

  const payload: CreateResponseBody = parseResult.data;
  const enabledToolkits = payload.enabled_toolkits;
  const disabledNativeActions = payload.disabled_native_actions;
  const skillCatalog = payload.skill_catalog;
  const stream = Boolean(payload.stream);
  const model = payload.model;
  const user = payload.user;
  const requestedPreviousResponseId =
    typeof payload.previous_response_id === "string" &&
    payload.previous_response_id.trim().length > 0
      ? payload.previous_response_id.trim()
      : undefined;

  // If model is NOT an openclaw:* agent-routing format, treat it as an LLM model override
  const modelOverride = resolveAgentIdFromModel(model) ? undefined : model;
  const agentId = resolveAgentIdForRequest({ req, model });
  const explicitSessionKey = getHeader(req, "x-openclaw-session-key")?.trim();
  const previousResponseEntry = requestedPreviousResponseId
    ? await findOpenResponsesLedgerEntry(requestedPreviousResponseId)
    : null;
  if (requestedPreviousResponseId && !previousResponseEntry) {
    sendJson(res, 400, {
      error: {
        message: "previous_response_id was not found",
        type: "invalid_request_error",
      },
    });
    return true;
  }
  if (previousResponseEntry && previousResponseEntry.agentId !== agentId) {
    sendJson(res, 400, {
      error: {
        message: "previous_response_id belongs to a different agent",
        type: "invalid_request_error",
      },
    });
    return true;
  }
  if (
    previousResponseEntry &&
    explicitSessionKey &&
    explicitSessionKey !== previousResponseEntry.sessionKey
  ) {
    sendJson(res, 400, {
      error: {
        message: "x-openclaw-session-key does not match previous_response_id session",
        type: "invalid_request_error",
      },
    });
    return true;
  }

  // Extract images + files from input (Phase 2)
  let images: ImageContent[] = [];
  let fileContexts: string[] = [];
  let urlParts = 0;
  const markUrlPart = () => {
    urlParts += 1;
    if (urlParts > limits.maxUrlParts) {
      throw new Error(
        `Too many URL-based input sources: ${urlParts} (limit: ${limits.maxUrlParts})`,
      );
    }
  };
  try {
    if (Array.isArray(payload.input)) {
      for (const item of payload.input) {
        if (item.type === "message" && typeof item.content !== "string") {
          for (const part of item.content) {
            if (part.type === "input_image") {
              const source = part.source as {
                type?: string;
                url?: string;
                data?: string;
                media_type?: string;
              };
              const sourceType =
                source.type === "base64" || source.type === "url" ? source.type : undefined;
              if (!sourceType) {
                throw new Error("input_image must have 'source.url' or 'source.data'");
              }
              if (sourceType === "url") {
                markUrlPart();
              }
              const imageSource: InputImageSource = {
                type: sourceType,
                url: source.url,
                data: source.data,
                mediaType: source.media_type,
              };
              const image = await extractImageContentFromSource(imageSource, limits.images);
              images.push(image);
              continue;
            }

            if (part.type === "input_file") {
              const source = part.source as {
                type?: string;
                url?: string;
                data?: string;
                media_type?: string;
                filename?: string;
              };
              const sourceType =
                source.type === "base64" || source.type === "url" ? source.type : undefined;
              if (!sourceType) {
                throw new Error("input_file must have 'source.url' or 'source.data'");
              }
              if (sourceType === "url") {
                markUrlPart();
              }
              const file = await extractFileContentFromSource({
                source: {
                  type: sourceType,
                  url: source.url,
                  data: source.data,
                  mediaType: source.media_type,
                  filename: source.filename,
                },
                limits: limits.files,
              });
              if (file.text?.trim()) {
                fileContexts.push(`<file name="${file.filename}">\n${file.text}\n</file>`);
              } else if (file.images && file.images.length > 0) {
                fileContexts.push(
                  `<file name="${file.filename}">[PDF content rendered to images]</file>`,
                );
              }
              if (file.images && file.images.length > 0) {
                images = images.concat(file.images);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    logWarn(`openresponses: request parsing failed: ${String(err)}`);
    sendJson(res, 400, {
      error: { message: "invalid request", type: "invalid_request_error" },
    });
    return true;
  }

  const clientTools = extractClientTools(payload);
  let toolChoicePrompt: string | undefined;
  let resolvedClientTools = clientTools;
  try {
    const toolChoiceResult = applyToolChoice({
      tools: clientTools,
      toolChoice: payload.tool_choice,
    });
    resolvedClientTools = toolChoiceResult.tools;
    toolChoicePrompt = toolChoiceResult.extraSystemPrompt;
  } catch (err) {
    logWarn(`openresponses: tool configuration failed: ${String(err)}`);
    sendJson(res, 400, {
      error: { message: "invalid tool configuration", type: "invalid_request_error" },
    });
    return true;
  }
  const sessionKey =
    previousResponseEntry?.sessionKey ?? resolveOpenResponsesSessionKey({ req, agentId, user });
  const parentResponseId = previousResponseEntry?.responseId;

  // Build prompt from input
  const prompt = buildAgentPrompt(payload.input);

  const fileContext = fileContexts.length > 0 ? fileContexts.join("\n\n") : undefined;
  const toolChoiceContext = toolChoicePrompt?.trim();

  // Handle instructions + file context as extra system prompt
  const extraSystemPrompt = [
    payload.instructions,
    prompt.extraSystemPrompt,
    toolChoiceContext,
    fileContext,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!prompt.message) {
    sendJson(res, 400, {
      error: {
        message: "Missing user message in `input`.",
        type: "invalid_request_error",
      },
    });
    return true;
  }

  const responseId = `resp_${randomUUID()}`;
  const outputItemId = `msg_${randomUUID()}`;
  const deps = createDefaultDeps();
  const streamParams =
    typeof payload.max_output_tokens === "number"
      ? { maxTokens: payload.max_output_tokens }
      : undefined;
  const thinkLevel = resolveRequestedThinkLevel(payload);
  const contextTokensOverride =
    typeof payload.context_window_tokens === "number" ? payload.context_window_tokens : undefined;
  const lane = typeof payload.lane === "string" ? payload.lane : undefined;

  // #region agent log
  {
    const creds = payload.runtime_credentials;
    fetch("http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "cacf83" },
      body: JSON.stringify({
        sessionId: "cacf83",
        location: "openresponses-http.ts:handleOpenResponsesHttpRequest",
        message: "gateway_runtime_credentials_received",
        data: {
          model,
          credCount: creds?.length ?? 0,
          creds: (creds ?? []).map((c) => ({
            provider: c.provider,
            tokenLen: c.access_token?.length ?? 0,
            tokenPrefix: c.access_token?.slice(0, 15) ?? "",
            validPrefix: c.access_token?.startsWith("sk-ant-oat01-") ?? false,
          })),
        },
        timestamp: Date.now(),
        hypothesisId: "D,E",
      }),
    }).catch(() => {});
  }
  // #endregion

  if (!stream) {
    ensureSentryGatewayInit();
    const nsMeta = readOpenResponsesMetadata(payload);
    const nsTrace = getHeader(req, "sentry-trace");
    const nsBaggage = getHeader(req, "baggage");
    return await Sentry.continueTrace(
      { sentryTrace: nsTrace ?? undefined, baggage: nsBaggage ?? undefined },
      async () =>
        Sentry.startSpan(
          {
            op: "gen_ai.chat",
            name: `openresponses ${agentId}`,
            attributes: {
              "gen_ai.operation.name": "chat",
              "gen_ai.request.model": model,
              "gen_ai.system": "openclaw",
              "gen_ai.agent.name": nsMeta.agentKey || agentId,
              ...(nsMeta.missionId ? { "mission.id": nsMeta.missionId } : {}),
              ...(nsMeta.userId ? { "user.id": nsMeta.userId } : {}),
            },
          },
          async () => {
            const traceCollector = createResponsesTraceCollector(responseId);
            try {
              const result = await runResponsesAgentCommand({
                message: prompt.message,
                images,
                clientTools: resolvedClientTools,
                enabledToolkits,
                disabledNativeActions,
                skillCatalog,
                extraSystemPrompt,
                streamParams,
                thinkLevel,
                contextTokensOverride,
                sessionKey,
                lane,
                runId: responseId,
                deps,
                modelOverride,
                runtimeCredentials: payload.runtime_credentials,
              });

              const payloads = (result as { payloads?: Array<{ text?: string }> } | null)?.payloads;
              const usage = extractUsageFromResult(result);
              const providerResponseId = extractProviderResponseId(result);
              const providerCost = extractProviderCost(result);
              const providerGenerationIds = extractProviderGenerationIds(result);
              const providerGenerations = extractProviderGenerations(result);
              const providerModel = extractResolvedProviderModel(result);
              const responseModel = providerModel ?? model;
              const contextMeta = extractContextMeta(result);
              const responseMetadata: Record<string, unknown> = {
                ...mergeOpenResponsesMetadata(
                  providerResponseId,
                  providerGenerationIds,
                  traceCollector.read(),
                ),
                ...(providerModel
                  ? { resolved_model_id: providerModel, provider_model: providerModel }
                  : {}),
                ...(contextMeta.contextWindowTokens != null
                  ? { context_window_tokens: contextMeta.contextWindowTokens }
                  : {}),
                ...(contextMeta.lastCallInputTokens != null
                  ? { last_call_input_tokens: contextMeta.lastCallInputTokens }
                  : {}),
              };
              const meta = (result as { meta?: unknown } | null)?.meta;
              const resultError = extractEmbeddedRunError(result);
              if (resultError) {
                const mapped = mapEmbeddedRunErrorToResponseError(resultError);
                const response = createResponseResource({
                  id: responseId,
                  model: responseModel,
                  status: "failed",
                  output: [],
                  usage,
                  error: { code: mapped.code, message: mapped.message },
                  metadata: { ...responseMetadata, ...mapped.metadata },
                  providerCost,
                  providerGenerationIds,
                  providerGenerations,
                });
                await recordOpenResponsesLedgerEntry({
                  responseId,
                  providerResponseId,
                  parentResponseId,
                  sessionKey,
                  agentId,
                  status: "failed",
                  createdAt: Date.now(),
                });
                sendJson(res, 200, response);
                return true;
              }
              const stopReason =
                meta && typeof meta === "object"
                  ? (meta as { stopReason?: string }).stopReason
                  : undefined;
              const pendingToolCalls =
                meta && typeof meta === "object"
                  ? (
                      meta as {
                        pendingToolCalls?: Array<{ id: string; name: string; arguments: string }>;
                      }
                    ).pendingToolCalls
                  : undefined;

              if (stopReason === "tool_calls" && pendingToolCalls && pendingToolCalls.length > 0) {
                const functionCallItems = pendingToolCalls.map((fc) => ({
                  type: "function_call" as const,
                  id: `call_${randomUUID()}`,
                  call_id: fc.id,
                  name: fc.name,
                  arguments: fc.arguments,
                }));
                const response = createResponseResource({
                  id: responseId,
                  model: responseModel,
                  status: "incomplete",
                  output: functionCallItems,
                  usage,
                  metadata: responseMetadata,
                  providerCost,
                  providerGenerationIds,
                  providerGenerations,
                });
                await recordOpenResponsesLedgerEntry({
                  responseId,
                  providerResponseId,
                  parentResponseId,
                  sessionKey,
                  agentId,
                  status: "incomplete",
                  createdAt: Date.now(),
                });
                sendJson(res, 200, response);
                return true;
              }

              const content =
                Array.isArray(payloads) && payloads.length > 0
                  ? payloads
                      .map((p) => (typeof p.text === "string" ? p.text : ""))
                      .filter(Boolean)
                      .join("\n\n")
                  : "The agent had nothing to add.";

              const response = createResponseResource({
                id: responseId,
                model: responseModel,
                status: "completed",
                output: [
                  createAssistantOutputItem({
                    id: outputItemId,
                    text: content,
                    status: "completed",
                  }),
                ],
                usage,
                metadata: responseMetadata,
                providerCost,
                providerGenerationIds,
                providerGenerations,
              });
              await recordOpenResponsesLedgerEntry({
                responseId,
                providerResponseId,
                parentResponseId,
                sessionKey,
                agentId,
                status: "completed",
                createdAt: Date.now(),
              });

              sendJson(res, 200, response);
            } catch (err) {
              logWarn(`openresponses: non-stream response failed: ${String(err)}`);
              await recordOpenResponsesLedgerEntry({
                responseId,
                parentResponseId,
                sessionKey,
                agentId,
                status: "failed",
                createdAt: Date.now(),
              });
              const classified = classifyOpenClawGatewayError(err);
              const failMetadata: Record<string, unknown> = {
                ...mergeOpenResponsesMetadata(undefined, undefined, traceCollector.read()),
              };
              failMetadata.retryable = classified.retryable;
              failMetadata.error_class = classified.code;
              const response = createResponseResource({
                id: responseId,
                model,
                status: "failed",
                output: [],
                error: { code: classified.code, message: classified.message },
                metadata: failMetadata,
              });
              sendJson(res, 500, response);
            } finally {
              traceCollector.unsubscribe();
            }
            return true;
          },
        ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Streaming mode
  // ─────────────────────────────────────────────────────────────────────────

  ensureSentryGatewayInit();
  const streamMeta = readOpenResponsesMetadata(payload);
  const recordAiInputs = process.env.SENTRY_AI_RECORD_INPUTS === "true";
  const recordAiOutputs = process.env.SENTRY_AI_RECORD_OUTPUTS === "true";
  const sentryTrace = getHeader(req, "sentry-trace");
  const baggage = getHeader(req, "baggage");

  await Sentry.continueTrace(
    { sentryTrace: sentryTrace ?? undefined, baggage: baggage ?? undefined },
    async () =>
      Sentry.startSpan(
        {
          op: "gen_ai.chat",
          name: `openresponses stream ${agentId}`,
          attributes: {
            "gen_ai.operation.name": "chat",
            "gen_ai.request.model": model,
            "gen_ai.system": "openclaw",
            "gen_ai.agent.name": streamMeta.agentKey || agentId,
            ...(streamMeta.missionId ? { "mission.id": streamMeta.missionId } : {}),
            ...(streamMeta.userId ? { "user.id": streamMeta.userId } : {}),
          },
        },
        async (parentSpan) => {
          setSseHeaders(res);
          logInfo(
            `[gateway/openresponses] stream_start responseId=${responseId} agentId=${agentId} sessionKey=${sessionKey ?? "none"} model=${model}`,
          );

          const toolSentrySpans = new Map<string, Sentry.Span>();
          let pendingLlmSpan: Sentry.Span | undefined;

          await new Promise<void>((resolve) => {
            let streamSettled = false;
            const settleStream = () => {
              if (streamSettled) {
                return;
              }
              streamSettled = true;
              pendingLlmSpan?.end();
              pendingLlmSpan = undefined;
              for (const s of toolSentrySpans.values()) {
                s.end();
              }
              toolSentrySpans.clear();
              resolve();
            };

            const finishRoot = (code: 1 | 2, message: string) => {
              parentSpan.setStatus({ code, message });
            };

            let accumulatedText = "";
            let sawAssistantDelta = false;
            let sawToolEvent = false;
            let outputTextStarted = false;
            let closed = false;
            let unsubscribe = () => {};

            const KEEPALIVE_INTERVAL_MS = 10_000;
            const keepaliveId = setInterval(() => {
              if (closed) {
                return;
              }
              try {
                res.write(": keepalive\n\n");
              } catch {
                // Connection already closed
              }
            }, KEEPALIVE_INTERVAL_MS);
            let finalUsage: Usage | undefined;
            let finalProviderResponseId: string | undefined;
            let finalProviderCost: number | undefined;
            let finalProviderGenerationIds: string[] = [];
            let finalProviderGenerations: unknown[] = [];
            let finalProviderModel: string | undefined;
            let finalContextMeta: ReturnType<typeof extractContextMeta> = {};
            let finalizeRequested: { status: ResponseResource["status"] } | null = null;
            let finalError: { code: string; message: string } | undefined;
            let finalFailureMetadata: Record<string, unknown> | undefined;
            const runAbortController = new AbortController();
            const activeToolArgsByToolCallId = new Map<string, unknown>();
            const activeArtifactByToolCallId = new Map<
              string,
              { kind: "funnel_page_tsx" | "lead_magnet_page_tsx"; label: string }
            >();

            const ensureOutputTextStarted = () => {
              if (outputTextStarted) {
                return;
              }
              outputTextStarted = true;
              writeSseEvent(res, {
                type: "response.output_text.start",
                item_id: outputItemId,
                output_index: 0,
                content_index: 0,
              });
            };

            const maybeFinalize = () => {
              if (closed) {
                return;
              }
              if (!finalizeRequested || !finalUsage) {
                logInfo(
                  `[gateway/openresponses] finalize_waiting responseId=${responseId} finalizeRequested=${!!finalizeRequested} finalUsage=${!!finalUsage}`,
                );
                return;
              }
              const usage = finalUsage;
              if (finalizeRequested.status === "failed") {
                logInfo(
                  `[gateway/openresponses] finalize_failed responseId=${responseId} usageTokens=${usage.total_tokens ?? 0}`,
                );

                closed = true;
                clearInterval(keepaliveId);
                unsubscribe();

                const errorResponse = createResponseResource({
                  id: responseId,
                  model,
                  status: "failed",
                  output: [],
                  error: finalError ?? { code: "agent_error", message: "Agent failed" },
                  usage,
                  metadata: finalFailureMetadata,
                  providerCost: finalProviderCost,
                  providerGenerationIds: finalProviderGenerationIds,
                  providerGenerations: finalProviderGenerations,
                });
                void recordOpenResponsesLedgerEntry({
                  responseId,
                  providerResponseId: finalProviderResponseId,
                  parentResponseId,
                  sessionKey,
                  agentId,
                  status: "failed",
                  createdAt: Date.now(),
                });

                writeSseEvent(res, { type: "response.failed", response: errorResponse });
                writeDone(res);
                res.end();
                finishRoot(2, "error");
                parentSpan.setAttribute("gen_ai.usage.input_tokens", usage.input_tokens ?? 0);
                parentSpan.setAttribute("gen_ai.usage.output_tokens", usage.output_tokens ?? 0);
                if (typeof usage.total_tokens === "number") {
                  parentSpan.setAttribute("gen_ai.usage.total_tokens", usage.total_tokens);
                }
                settleStream();
                return;
              }
              const finalText = accumulatedText || "The agent had nothing to add.";
              logInfo(
                `[gateway/openresponses] finalize_complete responseId=${responseId} status=${finalizeRequested.status} textLen=${finalText.length} usageTokens=${usage.total_tokens ?? 0}`,
              );

              closed = true;
              clearInterval(keepaliveId);
              unsubscribe();

              writeSseEvent(res, {
                type: "response.output_text.done",
                item_id: outputItemId,
                output_index: 0,
                content_index: 0,
                text: finalText,
              });

              writeSseEvent(res, {
                type: "response.content_part.done",
                item_id: outputItemId,
                output_index: 0,
                content_index: 0,
                part: { type: "output_text", text: finalText },
              });

              const completedItem = createAssistantOutputItem({
                id: outputItemId,
                text: finalText,
                status: "completed",
              });

              writeSseEvent(res, {
                type: "response.output_item.done",
                output_index: 0,
                item: completedItem,
              });

              const finalMetadata: Record<string, unknown> = {};
              if (finalProviderResponseId) {
                finalMetadata.provider_response_id = finalProviderResponseId;
              }
              if (finalProviderGenerationIds.length) {
                finalMetadata.provider_generation_ids = finalProviderGenerationIds;
              }
              if (finalProviderModel) {
                finalMetadata.resolved_model_id = finalProviderModel;
                finalMetadata.provider_model = finalProviderModel;
              }
              if (finalContextMeta.lastCallInputTokens != null) {
                finalMetadata.last_call_input_tokens = finalContextMeta.lastCallInputTokens;
              }
              if (finalContextMeta.contextWindowTokens != null) {
                finalMetadata.context_window_tokens = finalContextMeta.contextWindowTokens;
              }
              if (finalContextMeta.compactionCount != null) {
                finalMetadata.compaction_count = finalContextMeta.compactionCount;
              }
              if (finalContextMeta.systemPromptReport) {
                finalMetadata.system_prompt_report = finalContextMeta.systemPromptReport;
              }
              const finalResponse = createResponseResource({
                id: responseId,
                model: finalProviderModel ?? model,
                status: finalizeRequested.status,
                output: [completedItem],
                usage,
                metadata: finalMetadata,
                providerCost: finalProviderCost,
                providerGenerationIds: finalProviderGenerationIds,
                providerGenerations: finalProviderGenerations,
              });
              void recordOpenResponsesLedgerEntry({
                responseId,
                providerResponseId: finalProviderResponseId,
                parentResponseId,
                sessionKey,
                agentId,
                status: finalizeRequested.status,
                createdAt: Date.now(),
              });

              writeSseEvent(res, { type: "response.completed", response: finalResponse });
              writeDone(res);
              res.end();
              finishRoot(1, "ok");
              if (finalUsage) {
                parentSpan.setAttribute("gen_ai.usage.input_tokens", finalUsage.input_tokens ?? 0);
                parentSpan.setAttribute(
                  "gen_ai.usage.output_tokens",
                  finalUsage.output_tokens ?? 0,
                );
                if (typeof finalUsage.total_tokens === "number") {
                  parentSpan.setAttribute("gen_ai.usage.total_tokens", finalUsage.total_tokens);
                }
              }
              settleStream();
            };

            const requestFinalize = (
              status: ResponseResource["status"],
              error?: { code: string; message: string },
              metadata?: Record<string, unknown>,
            ) => {
              if (finalizeRequested) {
                return;
              }
              logInfo(
                `[gateway/openresponses] request_finalize status=${status} responseId=${responseId}`,
              );
              finalizeRequested = { status };
              finalError = error ?? finalError;
              finalFailureMetadata = metadata ?? finalFailureMetadata;
              if (status === "failed") {
                finalUsage = finalUsage ?? createEmptyUsage();
              }
              maybeFinalize();
              if (status === "failed" && !runAbortController.signal.aborted) {
                runAbortController.abort();
              }
            };

            const initialResponse = createResponseResource({
              id: responseId,
              model,
              status: "in_progress",
              output: [],
            });

            writeSseEvent(res, { type: "response.created", response: initialResponse });
            writeSseEvent(res, { type: "response.in_progress", response: initialResponse });

            const outputItem = createAssistantOutputItem({
              id: outputItemId,
              text: "",
              status: "in_progress",
            });

            writeSseEvent(res, {
              type: "response.output_item.added",
              output_index: 0,
              item: outputItem,
            });

            writeSseEvent(res, {
              type: "response.content_part.added",
              item_id: outputItemId,
              output_index: 0,
              content_index: 0,
              part: { type: "output_text", text: "" },
            });

            unsubscribe = onAgentEvent((evt) => {
              Sentry.withActiveSpan(parentSpan, () => {
                if (evt.runId !== responseId) {
                  return;
                }
                if (closed) {
                  return;
                }

                if (evt.stream === "assistant") {
                  const content = resolveAssistantStreamDeltaText(evt);
                  if (!content) {
                    return;
                  }

                  sawAssistantDelta = true;
                  accumulatedText += content;

                  ensureOutputTextStarted();
                  writeSseEvent(res, {
                    type: "response.output_text.delta",
                    item_id: outputItemId,
                    output_index: 0,
                    content_index: 0,
                    delta: content,
                  });
                  return;
                }

                if (evt.stream === "tool_args_delta") {
                  writeSseEvent(res, {
                    type: "response.tool_args.delta",
                    name: evt.data?.name,
                    tool_call_id: evt.data?.toolCallId,
                    partial_json: evt.data?.partialJson,
                  } as unknown as StreamingEvent);
                  return;
                }

                if (evt.stream === "tool") {
                  sawToolEvent = true;
                  const phase = evt.data?.phase;
                  const name = evt.data?.name;
                  const toolCallId =
                    typeof evt.data?.toolCallId === "string" ? evt.data.toolCallId : undefined;
                  if (phase === "start") {
                    if (toolCallId) {
                      activeToolArgsByToolCallId.set(toolCallId, evt.data?.args);
                    }
                    if (toolCallId) {
                      const toolName = typeof name === "string" ? name : "";
                      const resolved = resolveArtifactLifecycleFromToolStart({
                        toolName,
                        args: evt.data?.args,
                      });
                      if (resolved) {
                        activeArtifactByToolCallId.set(toolCallId, resolved);
                        writeSseEvent(res, {
                          type: "response.artifact.start",
                          artifact_id: toolCallId,
                          kind: resolved.kind,
                          label: resolved.label,
                        } as unknown as StreamingEvent);
                      }
                    }
                    const toolNameForSentry = typeof name === "string" ? name : "unknown_tool";
                    if (toolCallId) {
                      const tspan = Sentry.startInactiveSpan({
                        op: "gen_ai.execute_tool",
                        name: `execute_tool ${toolNameForSentry}`,
                        attributes: {
                          "gen_ai.operation.name": "execute_tool",
                          "gen_ai.tool.name": toolNameForSentry,
                          "gen_ai.tool.type": "function",
                          ...(recordAiInputs && evt.data?.args !== undefined
                            ? {
                                "gen_ai.tool.input": JSON.stringify(evt.data.args).slice(
                                  0,
                                  SENTRY_ATTR_MAX,
                                ),
                              }
                            : {}),
                        },
                      });
                      toolSentrySpans.set(toolCallId, tspan);
                    }
                    writeSseEvent(res, {
                      type: "response.tool.start",
                      name,
                      tool_call_id: toolCallId,
                      args: evt.data?.args,
                    } as StreamingEvent);
                  } else if (phase === "update") {
                    writeSseEvent(res, {
                      type: "response.tool.update",
                      name,
                      tool_call_id: toolCallId,
                      partial_result: evt.data?.partialResult,
                    } as StreamingEvent);
                  } else if (phase === "result") {
                    const startArgs = toolCallId
                      ? activeToolArgsByToolCallId.get(toolCallId)
                      : undefined;
                    const action =
                      startArgs &&
                      typeof startArgs === "object" &&
                      typeof (startArgs as Record<string, unknown>).action === "string"
                        ? ((startArgs as Record<string, unknown>).action as string)
                        : undefined;
                    const toolName = typeof name === "string" ? name : "";
                    const isError = evt.data?.isError ?? false;
                    const includeResult =
                      isError ||
                      toolName === "vibey_backend" ||
                      toolName === "campaign_capability" ||
                      toolName === "browser";
                    if (toolCallId) {
                      const artifact = activeArtifactByToolCallId.get(toolCallId);
                      if (artifact) {
                        writeSseEvent(res, {
                          type: "response.artifact.done",
                          artifact_id: toolCallId,
                          kind: artifact.kind,
                          label: artifact.label,
                          is_error: isError,
                        } as unknown as StreamingEvent);
                        activeArtifactByToolCallId.delete(toolCallId);
                      }
                      activeToolArgsByToolCallId.delete(toolCallId);
                    }
                    if (toolCallId) {
                      const ts = toolSentrySpans.get(toolCallId);
                      if (ts) {
                        if (recordAiOutputs && evt.data?.result !== undefined) {
                          ts.setAttribute(
                            "gen_ai.tool.output",
                            JSON.stringify(evt.data.result).slice(0, SENTRY_ATTR_MAX),
                          );
                        }
                        ts.setStatus({
                          code: isError ? 2 : 1,
                          message: isError ? "error" : "ok",
                        });
                        ts.end();
                        toolSentrySpans.delete(toolCallId);
                      }
                    }
                    writeSseEvent(res, {
                      type: "response.tool.done",
                      name,
                      tool_call_id: toolCallId,
                      is_error: isError,
                      ...(action ? { action } : {}),
                      ...(startArgs && typeof startArgs === "object" ? { args: startArgs } : {}),
                      ...(includeResult ? { result: evt.data?.result } : {}),
                    } as StreamingEvent);
                  }
                  return;
                }

                if (evt.stream === "thinking") {
                  const delta = typeof evt.data?.delta === "string" ? evt.data.delta : "";
                  const text = typeof evt.data?.text === "string" ? evt.data.text : "";
                  if (delta) {
                    writeSseEvent(res, {
                      type: "response.reasoning.delta",
                      delta,
                      text,
                    } as StreamingEvent);
                  }
                  return;
                }

                if (evt.stream === "trace") {
                  const traceData: Record<string, unknown> = {
                    type: "response.trace",
                    trace_type: evt.data?.type,
                  };
                  if (evt.data?.type === "system_prompt") {
                    traceData.system_prompt = evt.data.system_prompt;
                    if (recordAiInputs && typeof evt.data.system_prompt === "string") {
                      parentSpan.setAttribute(
                        "gen_ai.system_instructions",
                        evt.data.system_prompt.slice(0, SENTRY_ATTR_MAX),
                      );
                    }
                  } else if (evt.data?.type === "llm_input") {
                    traceData.provider = evt.data.provider;
                    traceData.model = evt.data.model;
                    traceData.prompt = evt.data.prompt;
                    traceData.messages = evt.data.messages;
                    traceData.images_count = evt.data.images_count;
                    pendingLlmSpan?.end();
                    pendingLlmSpan = undefined;
                    const mdl = typeof evt.data.model === "string" ? evt.data.model : model;
                    pendingLlmSpan = Sentry.startInactiveSpan({
                      op: "gen_ai.request",
                      name: `llm ${mdl}`,
                      attributes: {
                        "gen_ai.operation.name": "request",
                        "gen_ai.request.model": mdl,
                        "gen_ai.system": "openclaw",
                        ...(typeof evt.data.provider === "string"
                          ? { "gen_ai.provider": evt.data.provider }
                          : {}),
                      },
                    });
                    if (recordAiInputs) {
                      if (evt.data.messages !== undefined) {
                        pendingLlmSpan.setAttribute(
                          "gen_ai.request.messages",
                          JSON.stringify(evt.data.messages).slice(0, SENTRY_ATTR_MAX),
                        );
                      }
                      if (typeof evt.data.prompt === "string") {
                        pendingLlmSpan.setAttribute(
                          "gen_ai.prompt",
                          evt.data.prompt.slice(0, SENTRY_ATTR_MAX),
                        );
                      }
                    }
                  } else if (evt.data?.type === "llm_output") {
                    traceData.messages = evt.data.messages;
                    if (pendingLlmSpan) {
                      if (recordAiOutputs && evt.data.messages !== undefined) {
                        pendingLlmSpan.setAttribute(
                          "gen_ai.response.text",
                          JSON.stringify(evt.data.messages).slice(0, SENTRY_ATTR_MAX),
                        );
                      }
                      pendingLlmSpan.setStatus({ code: 1, message: "ok" });
                      pendingLlmSpan.end();
                      pendingLlmSpan = undefined;
                    }
                  } else if (evt.data?.type === "timing") {
                    for (const [key, value] of Object.entries(evt.data)) {
                      if (key !== "type") {
                        traceData[key] = value;
                      }
                    }
                  }
                  writeSseEvent(res, traceData as StreamingEvent);
                  return;
                }

                if (evt.stream === "billing") {
                  const billingData =
                    evt.data && typeof evt.data === "object" && !Array.isArray(evt.data)
                      ? (evt.data as Record<string, unknown>)
                      : {};
                  writeSseEvent(res, {
                    ...billingData,
                    type: "response.billing.started",
                  } as unknown as StreamingEvent);
                  return;
                }

                if (evt.stream === "compaction") {
                  const compactionData =
                    evt.data && typeof evt.data === "object" && !Array.isArray(evt.data)
                      ? (evt.data as Record<string, unknown>)
                      : {};
                  writeSseEvent(res, {
                    ...compactionData,
                    type: "response.compaction",
                  } as unknown as StreamingEvent);
                  const phase = compactionData.phase;
                  if (phase === "start") {
                    writeSseEvent(res, {
                      type: "response.status",
                      phase: "compacting",
                      message: "Summarizing the work so far",
                    } as unknown as StreamingEvent);
                    try {
                      if (
                        typeof (res as unknown as Record<string, unknown>).flushHeaders ===
                        "function"
                      ) {
                        (res as unknown as { flushHeaders: () => void }).flushHeaders();
                      }
                    } catch {}
                    try {
                      if (typeof (res as unknown as Record<string, unknown>).flush === "function") {
                        (res as unknown as { flush: () => void }).flush();
                      }
                    } catch {}
                  }
                  return;
                }

                if (evt.stream === "lifecycle") {
                  const phase = evt.data?.phase;
                  if (phase === "end" || phase === "error") {
                    const finalStatus = phase === "error" ? "failed" : "completed";
                    const errorMessage =
                      typeof evt.data?.error === "string" ? evt.data.error : "Agent failed";
                    requestFinalize(
                      finalStatus,
                      finalStatus === "failed"
                        ? { code: "agent_error", message: errorMessage }
                        : undefined,
                    );
                  }
                }
              });
            });

            req.on("close", () => {
              logInfo(
                `[gateway/openresponses] client_close responseId=${responseId} streamSettled=${streamSettled}`,
              );
              closed = true;
              clearInterval(keepaliveId);
              runAbortController.abort();
              unsubscribe();
              if (!streamSettled) {
                finishRoot(2, "cancelled");
                settleStream();
              }
            });

            void (async () => {
              try {
                const result = await runResponsesAgentCommand({
                  message: prompt.message,
                  images,
                  clientTools: resolvedClientTools,
                  enabledToolkits,
                  disabledNativeActions,
                  skillCatalog,
                  extraSystemPrompt,
                  streamParams,
                  thinkLevel,
                  contextTokensOverride,
                  sessionKey,
                  lane,
                  runId: responseId,
                  deps,
                  modelOverride,
                  runtimeCredentials: payload.runtime_credentials,
                  abortSignal: runAbortController.signal,
                });

                finalUsage = extractUsageFromResult(result);
                finalProviderResponseId = extractProviderResponseId(result);
                finalProviderCost = extractProviderCost(result);
                finalProviderGenerationIds = extractProviderGenerationIds(result);
                finalProviderGenerations = extractProviderGenerations(result);
                finalProviderModel = extractResolvedProviderModel(result);
                finalContextMeta = extractContextMeta(result);
                logInfo(
                  `[gateway/openresponses] agent_command_resolved responseId=${responseId} hasUsage=${!!finalUsage} sawAssistantDelta=${sawAssistantDelta}`,
                );

                if (closed) {
                  return;
                }
                const resultError = extractEmbeddedRunError(result);
                if (resultError) {
                  const mapped = mapEmbeddedRunErrorToResponseError(resultError);
                  requestFinalize(
                    "failed",
                    { code: mapped.code, message: mapped.message },
                    {
                      ...mapped.metadata,
                      ...(finalContextMeta.contextWindowTokens != null
                        ? { context_window_tokens: finalContextMeta.contextWindowTokens }
                        : {}),
                      ...(finalContextMeta.lastCallInputTokens != null
                        ? { last_call_input_tokens: finalContextMeta.lastCallInputTokens }
                        : {}),
                      ...(finalContextMeta.compactionCount != null
                        ? { compaction_count: finalContextMeta.compactionCount }
                        : {}),
                    },
                  );
                  return;
                }

                const resultAny = result as {
                  payloads?: Array<{ text?: string }>;
                  meta?: unknown;
                };
                const payloads = resultAny.payloads;
                const resultText = extractPayloadText(payloads);

                if (!sawAssistantDelta) {
                  const meta = resultAny.meta;
                  const stopReason =
                    meta && typeof meta === "object"
                      ? (meta as { stopReason?: string }).stopReason
                      : undefined;
                  const pendingToolCalls =
                    meta && typeof meta === "object"
                      ? (
                          meta as {
                            pendingToolCalls?: Array<{
                              id: string;
                              name: string;
                              arguments: string;
                            }>;
                          }
                        ).pendingToolCalls
                      : undefined;

                  if (
                    stopReason === "tool_calls" &&
                    pendingToolCalls &&
                    pendingToolCalls.length > 0
                  ) {
                    const usage = finalUsage ?? createEmptyUsage();

                    writeSseEvent(res, {
                      type: "response.output_text.done",
                      item_id: outputItemId,
                      output_index: 0,
                      content_index: 0,
                      text: "",
                    });
                    writeSseEvent(res, {
                      type: "response.content_part.done",
                      item_id: outputItemId,
                      output_index: 0,
                      content_index: 0,
                      part: { type: "output_text", text: "" },
                    });

                    const completedItem = createAssistantOutputItem({
                      id: outputItemId,
                      text: "",
                      status: "completed",
                    });
                    writeSseEvent(res, {
                      type: "response.output_item.done",
                      output_index: 0,
                      item: completedItem,
                    });

                    const functionCallItems = pendingToolCalls.map((fc, idx) => {
                      const item = {
                        type: "function_call" as const,
                        id: `call_${randomUUID()}`,
                        call_id: fc.id,
                        name: fc.name,
                        arguments: fc.arguments,
                      };
                      const outputIndex = idx + 1;
                      writeSseEvent(res, {
                        type: "response.output_item.added",
                        output_index: outputIndex,
                        item,
                      });
                      writeSseEvent(res, {
                        type: "response.output_item.done",
                        output_index: outputIndex,
                        item: { ...item, status: "completed" as const },
                      });
                      return item;
                    });

                    const toolCallMetadata: Record<string, unknown> = {};
                    if (finalProviderResponseId) {
                      toolCallMetadata.provider_response_id = finalProviderResponseId;
                    }
                    if (finalProviderGenerationIds.length) {
                      toolCallMetadata.provider_generation_ids = finalProviderGenerationIds;
                    }
                    const incompleteResponse = createResponseResource({
                      id: responseId,
                      model,
                      status: "incomplete",
                      output: [completedItem, ...functionCallItems],
                      usage,
                      metadata:
                        Object.keys(toolCallMetadata).length > 0 ? toolCallMetadata : undefined,
                      providerCost: finalProviderCost,
                      providerGenerationIds: finalProviderGenerationIds,
                      providerGenerations: finalProviderGenerations,
                    });
                    await recordOpenResponsesLedgerEntry({
                      responseId,
                      providerResponseId: finalProviderResponseId,
                      parentResponseId,
                      sessionKey,
                      agentId,
                      status: "incomplete",
                      createdAt: Date.now(),
                    });
                    closed = true;
                    unsubscribe();
                    writeSseEvent(res, {
                      type: "response.completed",
                      response: incompleteResponse,
                    });
                    writeDone(res);
                    res.end();
                    finishRoot(1, "ok");
                    settleStream();
                    return;
                  }

                  const content =
                    resultText.length > 0 ? resultText : "The agent had nothing to add.";

                  accumulatedText = content;
                  sawAssistantDelta = true;

                  ensureOutputTextStarted();
                  writeSseEvent(res, {
                    type: "response.output_text.delta",
                    item_id: outputItemId,
                    output_index: 0,
                    content_index: 0,
                    delta: content,
                  });
                } else if (
                  sawToolEvent &&
                  resultText &&
                  resultText !== accumulatedText &&
                  resultText.startsWith(accumulatedText)
                ) {
                  const delta = resultText.slice(accumulatedText.length);
                  if (delta) {
                    accumulatedText = resultText;
                    ensureOutputTextStarted();
                    writeSseEvent(res, {
                      type: "response.output_text.delta",
                      item_id: outputItemId,
                      output_index: 0,
                      content_index: 0,
                      delta,
                    });
                  }
                }

                maybeFinalize();
              } catch (err) {
                logWarn(`openresponses: streaming response failed: ${String(err)}`);
                if (closed) {
                  return;
                }

                const classified = classifyOpenClawGatewayError(err);
                finalUsage = finalUsage ?? createEmptyUsage();
                requestFinalize(
                  "failed",
                  { code: classified.code, message: classified.message },
                  {
                    retryable: classified.retryable,
                    error_class: classified.code,
                  },
                );
              } finally {
                if (!closed) {
                  emitAgentEvent({
                    runId: responseId,
                    stream: "lifecycle",
                    data: { phase: "end" },
                  });
                }
              }
            })();
          });
        },
      ),
  );

  return true;
}
