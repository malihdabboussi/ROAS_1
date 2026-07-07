import { formatErrorMessage } from "../infra/errors.js";
import { mediaKindFromMime } from "../media/constants.js";
import { buildTelegramThreadParams } from "./bot/helpers.js";
import { stripTelegramInternalPrefixes } from "./targets.js";

export const PARSE_ERR_RE = /can't parse entities|parse entities|find end of the entity/i;
export const THREAD_NOT_FOUND_RE = /400:\s*Bad Request:\s*message thread not found/i;
export const MESSAGE_NOT_MODIFIED_RE =
  /400:\s*Bad Request:\s*message is not modified|MESSAGE_NOT_MODIFIED/i;
export const CHAT_NOT_FOUND_RE = /400: Bad Request: chat not found/i;

export function normalizeChatId(to: string): string {
  const trimmed = to.trim();
  if (!trimmed) {
    throw new Error("Recipient is required for Telegram sends");
  }

  let normalized = stripTelegramInternalPrefixes(trimmed);

  const m =
    /^https?:\/\/t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized) ??
    /^t\.me\/([A-Za-z0-9_]+)$/i.exec(normalized);
  if (m?.[1]) {
    normalized = `@${m[1]}`;
  }

  if (!normalized) {
    throw new Error("Recipient is required for Telegram sends");
  }
  if (normalized.startsWith("@")) {
    return normalized;
  }
  if (/^-?\d+$/.test(normalized)) {
    return normalized;
  }

  if (/^[A-Za-z0-9_]{5,}$/i.test(normalized)) {
    return `@${normalized}`;
  }

  return normalized;
}

export function normalizeMessageId(raw: string | number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      throw new Error("Message id is required for Telegram actions");
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new Error("Message id is required for Telegram actions");
}

export function isTelegramThreadNotFoundError(err: unknown): boolean {
  return THREAD_NOT_FOUND_RE.test(formatErrorMessage(err));
}

export function isTelegramMessageNotModifiedError(err: unknown): boolean {
  return MESSAGE_NOT_MODIFIED_RE.test(formatErrorMessage(err));
}

export function hasMessageThreadIdParam(params?: Record<string, unknown>): boolean {
  if (!params) {
    return false;
  }
  const value = params.message_thread_id;
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return false;
}

export function removeMessageThreadIdParam(
  params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!params || !hasMessageThreadIdParam(params)) {
    return params;
  }
  const next = { ...params };
  delete next.message_thread_id;
  return Object.keys(next).length > 0 ? next : undefined;
}

export function isTelegramHtmlParseError(err: unknown): boolean {
  return PARSE_ERR_RE.test(formatErrorMessage(err));
}

export function buildTelegramThreadReplyParams(params: {
  targetMessageThreadId?: number;
  messageThreadId?: number;
  replyToMessageId?: number;
  quoteText?: string;
}): Record<string, unknown> {
  const messageThreadId =
    params.messageThreadId != null ? params.messageThreadId : params.targetMessageThreadId;
  const threadSpec =
    messageThreadId != null ? { id: messageThreadId, scope: "forum" as const } : undefined;
  const threadIdParams = buildTelegramThreadParams(threadSpec);
  const threadParams: Record<string, unknown> = threadIdParams ? { ...threadIdParams } : {};

  if (params.replyToMessageId != null) {
    const replyToMessageId = Math.trunc(params.replyToMessageId);
    if (params.quoteText?.trim()) {
      threadParams.reply_parameters = {
        message_id: replyToMessageId,
        quote: params.quoteText.trim(),
      };
    } else {
      threadParams.reply_to_message_id = replyToMessageId;
    }
  }
  return threadParams;
}

export async function withTelegramHtmlParseFallback<T>(params: {
  label: string;
  verbose?: boolean;
  requestHtml: (label: string) => Promise<T>;
  requestPlain: (label: string) => Promise<T>;
}): Promise<T> {
  try {
    return await params.requestHtml(params.label);
  } catch (err) {
    if (!isTelegramHtmlParseError(err)) {
      throw err;
    }
    if (params.verbose) {
      console.warn(
        `telegram ${params.label} failed with HTML parse error, retrying as plain text: ${formatErrorMessage(
          err,
        )}`,
      );
    }
    return await params.requestPlain(`${params.label}-plain`);
  }
}

export async function withTelegramThreadFallback<T>(
  params: Record<string, unknown> | undefined,
  label: string,
  verbose: boolean | undefined,
  attempt: (
    effectiveParams: Record<string, unknown> | undefined,
    effectiveLabel: string,
  ) => Promise<T>,
): Promise<T> {
  try {
    return await attempt(params, label);
  } catch (err) {
    if (!hasMessageThreadIdParam(params) || !isTelegramThreadNotFoundError(err)) {
      throw err;
    }
    if (verbose) {
      console.warn(
        `telegram ${label} failed with message_thread_id, retrying without thread: ${formatErrorMessage(err)}`,
      );
    }
    const retriedParams = removeMessageThreadIdParam(params);
    return await attempt(retriedParams, `${label}-threadless`);
  }
}

export function wrapTelegramChatNotFoundError(
  err: unknown,
  params: { chatId: string; input: string },
) {
  if (!CHAT_NOT_FOUND_RE.test(formatErrorMessage(err))) {
    return err;
  }
  return new Error(
    [
      `Telegram send failed: chat not found (chat_id=${params.chatId}).`,
      "Likely: bot not started in DM, bot removed from group/channel, group migrated (new -100… id), or wrong bot token.",
      `Input was: ${JSON.stringify(params.input)}.`,
    ].join(" "),
  );
}

export function inferFilename(kind: ReturnType<typeof mediaKindFromMime>) {
  switch (kind) {
    case "image":
      return "image.jpg";
    case "video":
      return "video.mp4";
    case "audio":
      return "audio.ogg";
    default:
      return "file.bin";
  }
}
