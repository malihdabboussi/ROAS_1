import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { createDefaultDeps } from "../cli/deps.js";
import { agentCommand } from "../commands/agent.js";
import { emitAgentEvent, onAgentEvent } from "../infra/agent-events.js";
import { logWarn } from "../logger.js";
import { defaultRuntime } from "../runtime.js";
import { resolveAssistantStreamDeltaText } from "./agent-event-assistant-text.js";
import {
  buildAgentMessageFromConversationEntries,
  type ConversationEntry,
} from "./agent-prompt.js";
import { sendJson, setSseHeaders, writeDone } from "./http-common.js";
import { handleGatewayPostJsonEndpoint } from "./http-endpoint-helpers.js";
import { resolveAgentIdForRequest, resolveSessionKey } from "./http-utils.js";

type OpenAiHttpOptions = {
  auth: ResolvedGatewayAuth;
  maxBodyBytes?: number;
  trustedProxies?: string[];
  rateLimiter?: AuthRateLimiter;
};

type OpenAiChatMessage = {
  role?: unknown;
  content?: unknown;
  name?: unknown;
};

type OpenAiChatCompletionRequest = {
  model?: unknown;
  stream?: unknown;
  messages?: unknown;
  user?: unknown;
};

function writeSse(res: ServerResponse, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildProviderBillingMetadata(
  agentMeta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!agentMeta) {
    return undefined;
  }
  const metadata: Record<string, unknown> = {};
  const providerResponseId =
    typeof agentMeta.providerResponseId === "string" ? agentMeta.providerResponseId : undefined;
  const providerCost =
    typeof agentMeta.providerCost === "number" && Number.isFinite(agentMeta.providerCost)
      ? agentMeta.providerCost
      : undefined;
  const providerGenerationIds = Array.isArray(agentMeta.providerGenerationIds)
    ? agentMeta.providerGenerationIds.filter((id): id is string => typeof id === "string")
    : [];
  const providerGenerations = Array.isArray(agentMeta.providerGenerations)
    ? agentMeta.providerGenerations.filter(
        (generation) => generation && typeof generation === "object",
      )
    : [];

  if (providerResponseId) {
    metadata.provider_response_id = providerResponseId;
  }
  if (providerCost !== undefined) {
    metadata.provider_cost = providerCost;
  }
  if (providerGenerationIds.length) {
    metadata.provider_generation_ids = providerGenerationIds;
  }
  if (providerGenerations.length) {
    metadata.provider_generations = providerGenerations;
  }
  if (
    providerResponseId ||
    providerCost !== undefined ||
    providerGenerationIds.length ||
    providerGenerations.length
  ) {
    metadata.provider_billing = "openrouter";
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function asMessages(val: unknown): OpenAiChatMessage[] {
  return Array.isArray(val) ? (val as OpenAiChatMessage[]) : [];
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }
        const type = (part as { type?: unknown }).type;
        const text = (part as { text?: unknown }).text;
        const inputText = (part as { input_text?: unknown }).input_text;
        const source = (part as { source?: unknown }).source as
          | { url?: unknown; data?: unknown; media_type?: unknown; filename?: unknown }
          | undefined;
        if (type === "text" && typeof text === "string") {
          return text;
        }
        if (type === "input_text" && typeof text === "string") {
          return text;
        }
        if (typeof inputText === "string") {
          return inputText;
        }
        if (type === "input_file" || type === "input_image") {
          const sourceUrl = source && typeof source.url === "string" ? source.url : "";
          const mediaType =
            source && typeof source.media_type === "string" ? source.media_type : "unknown";
          const fileName =
            source && typeof source.filename === "string" ? source.filename : "attachment";
          if (sourceUrl) {
            return `[${String(type)} ${fileName} ${mediaType}: ${sourceUrl}]`;
          }
          if (source && typeof source.data === "string" && source.data.length > 0) {
            return `[${String(type)} ${fileName} ${mediaType}: inline_data]`;
          }
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function buildAgentPrompt(messagesUnknown: unknown): {
  message: string;
  extraSystemPrompt?: string;
} {
  const messages = asMessages(messagesUnknown);

  const systemParts: string[] = [];
  const conversationEntries: ConversationEntry[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      continue;
    }
    const role = typeof msg.role === "string" ? msg.role.trim() : "";
    const content = extractTextContent(msg.content).trim();
    if (!role || !content) {
      continue;
    }
    if (role === "system" || role === "developer") {
      systemParts.push(content);
      continue;
    }

    const normalizedRole = role === "function" ? "tool" : role;
    if (normalizedRole !== "user" && normalizedRole !== "assistant" && normalizedRole !== "tool") {
      continue;
    }

    const name = typeof msg.name === "string" ? msg.name.trim() : "";
    const sender =
      normalizedRole === "assistant"
        ? "Assistant"
        : normalizedRole === "user"
          ? "User"
          : name
            ? `Tool:${name}`
            : "Tool";

    conversationEntries.push({
      role: normalizedRole,
      entry: { sender, body: content },
    });
  }

  const message = buildAgentMessageFromConversationEntries(conversationEntries);

  return {
    message,
    extraSystemPrompt: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
  };
}

function resolveOpenAiSessionKey(params: {
  req: IncomingMessage;
  agentId: string;
  user?: string | undefined;
}): string {
  return resolveSessionKey({ ...params, prefix: "openai" });
}

function coerceRequest(val: unknown): OpenAiChatCompletionRequest {
  if (!val || typeof val !== "object") {
    return {};
  }
  return val as OpenAiChatCompletionRequest;
}

export async function handleOpenAiHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: OpenAiHttpOptions,
): Promise<boolean> {
  const handled = await handleGatewayPostJsonEndpoint(req, res, {
    pathname: "/v1/chat/completions",
    auth: opts.auth,
    trustedProxies: opts.trustedProxies,
    rateLimiter: opts.rateLimiter,
    maxBodyBytes: opts.maxBodyBytes ?? 1024 * 1024,
  });
  if (handled === false) {
    return false;
  }
  if (!handled) {
    return true;
  }

  const payload = coerceRequest(handled.body);
  const stream = Boolean(payload.stream);
  const model = typeof payload.model === "string" ? payload.model : "openclaw";
  const user = typeof payload.user === "string" ? payload.user : undefined;

  const agentId = resolveAgentIdForRequest({ req, model });
  const sessionKey = resolveOpenAiSessionKey({ req, agentId, user });
  const prompt = buildAgentPrompt(payload.messages);
  if (!prompt.message) {
    sendJson(res, 400, {
      error: {
        message: "Missing user message in `messages`.",
        type: "invalid_request_error",
      },
    });
    return true;
  }

  const runId = `chatcmpl_${randomUUID()}`;
  const deps = createDefaultDeps();

  if (!stream) {
    try {
      const result = await agentCommand(
        {
          message: prompt.message,
          extraSystemPrompt: prompt.extraSystemPrompt,
          sessionKey,
          runId,
          deliver: false,
          messageChannel: "webchat",
          bestEffortDeliver: false,
        },
        defaultRuntime,
        deps,
      );

      const resultAny = result as {
        payloads?: Array<{ text?: string }>;
        meta?: { agentMeta?: Record<string, unknown> };
      } | null;
      const payloads = resultAny?.payloads;
      const content =
        Array.isArray(payloads) && payloads.length > 0
          ? payloads
              .map((p) => (typeof p.text === "string" ? p.text : ""))
              .filter(Boolean)
              .join("\n\n")
          : "The agent had nothing to add.";

      const agentMeta = resultAny?.meta?.agentMeta;
      const usageRaw = agentMeta?.usage as
        | {
            input?: number;
            output?: number;
            cacheRead?: number;
            cacheWrite?: number;
            total?: number;
          }
        | undefined;
      const promptTokens =
        (usageRaw?.input ?? 0) + (usageRaw?.cacheRead ?? 0) + (usageRaw?.cacheWrite ?? 0);
      const completionTokens = usageRaw?.output ?? 0;
      const providerResponseId = agentMeta?.providerResponseId as string | undefined;
      const providerMetadata = buildProviderBillingMetadata(agentMeta);

      sendJson(res, 200, {
        id: providerResponseId || runId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
        ...(providerMetadata ? { metadata: providerMetadata } : {}),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logWarn(`openai-compat: chat completion failed: ${errMsg}`);
      sendJson(res, 500, {
        error: { message: errMsg, type: "api_error" },
      });
    }
    return true;
  }

  setSseHeaders(res);

  let wroteRole = false;
  let sawAssistantDelta = false;
  let accumulatedText = "";
  let closed = false;
  const runAbortController = new AbortController();

  const writeAssistantDelta = (content: string) => {
    if (!wroteRole) {
      wroteRole = true;
      writeSse(res, {
        id: runId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, delta: { role: "assistant" } }],
      });
    }

    sawAssistantDelta = true;
    accumulatedText += content;
    writeSse(res, {
      id: runId,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: { content },
          finish_reason: null,
        },
      ],
    });
  };

  const unsubscribe = onAgentEvent((evt) => {
    if (evt.runId !== runId) {
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

      writeAssistantDelta(content);
      return;
    }

    if (evt.stream === "billing") {
      writeSse(res, {
        id: runId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [],
        metadata: {
          type: "response.billing.started",
          ...(evt.data ?? {}),
        },
      });
      return;
    }

    if (evt.stream === "lifecycle") {
      const phase = evt.data?.phase;
      if (phase === "error" && !runAbortController.signal.aborted) {
        runAbortController.abort();
      }
    }
  });

  req.on("close", () => {
    closed = true;
    runAbortController.abort();
    unsubscribe();
  });

  void (async () => {
    try {
      const result = await agentCommand(
        {
          message: prompt.message,
          extraSystemPrompt: prompt.extraSystemPrompt,
          sessionKey,
          runId,
          deliver: false,
          messageChannel: "webchat",
          bestEffortDeliver: false,
          abortSignal: runAbortController.signal,
        },
        defaultRuntime,
        deps,
      );

      if (closed) {
        return;
      }

      const payloads = (result as { payloads?: Array<{ text?: string }> } | null)?.payloads;
      const resultText =
        Array.isArray(payloads) && payloads.length > 0
          ? payloads
              .map((p) => (typeof p.text === "string" ? p.text : ""))
              .filter(Boolean)
              .join("\n\n")
          : "";

      if (!sawAssistantDelta) {
        writeAssistantDelta(resultText || "The agent had nothing to add.");
      } else if (resultText && resultText !== accumulatedText) {
        const delta = resultText.startsWith(accumulatedText)
          ? resultText.slice(accumulatedText.length)
          : `\n\n${resultText}`;
        writeAssistantDelta(delta);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logWarn(`openai-compat: streaming chat completion failed: ${errMsg}`);
      if (closed) {
        return;
      }
      writeSse(res, {
        id: runId,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: { content: `Error: ${errMsg}` },
            finish_reason: "stop",
          },
        ],
      });
      emitAgentEvent({
        runId,
        stream: "lifecycle",
        data: { phase: "error" },
      });
    } finally {
      if (!closed) {
        closed = true;
        unsubscribe();
        writeDone(res);
        res.end();
      }
    }
  })();

  return true;
}
