import { Bot } from "grammy";
import type { RetryConfig } from "../infra/retry.js";
import type { TelegramSendResult } from "./send-message-types.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import {
  createRequestWithChatNotFound,
  createTelegramRequestWithDiag,
  resolveTelegramApiContext,
} from "./send-client.js";
import {
  buildTelegramThreadReplyParams,
  normalizeChatId,
  withTelegramThreadFallback,
} from "./send-utils.js";
import { recordSentMessage } from "./sent-message-cache.js";
import { parseTelegramTarget } from "./targets.js";

type TelegramStickerOpts = {
  token?: string;
  accountId?: string;
  verbose?: boolean;
  api?: Bot["api"];
  retry?: RetryConfig;
  replyToMessageId?: number;
  messageThreadId?: number;
};

export async function sendStickerTelegram(
  to: string,
  fileId: string,
  opts: TelegramStickerOpts = {},
): Promise<TelegramSendResult> {
  if (!fileId?.trim()) {
    throw new Error("Telegram sticker file_id is required");
  }

  const { cfg, account, api } = resolveTelegramApiContext(opts);
  const target = parseTelegramTarget(to);
  const chatId = normalizeChatId(target.chatId);

  const threadParams = buildTelegramThreadReplyParams({
    targetMessageThreadId: target.messageThreadId,
    messageThreadId: opts.messageThreadId,
    replyToMessageId: opts.replyToMessageId,
  });
  const hasThreadParams = Object.keys(threadParams).length > 0;

  const requestWithDiag = createTelegramRequestWithDiag({
    cfg,
    account,
    retry: opts.retry,
    verbose: opts.verbose,
    useApiErrorLogging: false,
  });
  const requestWithChatNotFound = createRequestWithChatNotFound({
    requestWithDiag,
    chatId,
    input: to,
  });

  const stickerParams = hasThreadParams ? threadParams : undefined;

  const result = await withTelegramThreadFallback(
    stickerParams,
    "sticker",
    opts.verbose,
    async (effectiveParams, label) =>
      requestWithChatNotFound(() => api.sendSticker(chatId, fileId.trim(), effectiveParams), label),
  );

  const messageId = String(result?.message_id ?? "unknown");
  const resolvedChatId = String(result?.chat?.id ?? chatId);
  if (result?.message_id) {
    recordSentMessage(chatId, result.message_id);
  }
  recordChannelActivity({
    channel: "telegram",
    accountId: account.accountId,
    direction: "outbound",
  });

  return { messageId, chatId: resolvedChatId };
}
