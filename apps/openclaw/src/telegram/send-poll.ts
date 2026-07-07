import { Bot } from "grammy";
import type { RetryConfig } from "../infra/retry.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { normalizePollInput, type PollInput } from "../polls.js";
import { isRecoverableTelegramNetworkError } from "./network-errors.js";
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

type TelegramPollOpts = {
  token?: string;
  accountId?: string;
  verbose?: boolean;
  api?: Bot["api"];
  retry?: RetryConfig;
  replyToMessageId?: number;
  messageThreadId?: number;
  silent?: boolean;
  isAnonymous?: boolean;
};

export async function sendPollTelegram(
  to: string,
  poll: PollInput,
  opts: TelegramPollOpts = {},
): Promise<{ messageId: string; chatId: string; pollId?: string }> {
  const { cfg, account, api } = resolveTelegramApiContext(opts);
  const target = parseTelegramTarget(to);
  const chatId = normalizeChatId(target.chatId);

  const normalizedPoll = normalizePollInput(poll, { maxOptions: 10 });

  const threadParams = buildTelegramThreadReplyParams({
    targetMessageThreadId: target.messageThreadId,
    messageThreadId: opts.messageThreadId,
    replyToMessageId: opts.replyToMessageId,
  });

  const pollOptions = normalizedPoll.options;

  const requestWithDiag = createTelegramRequestWithDiag({
    cfg,
    account,
    retry: opts.retry,
    verbose: opts.verbose,
    shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" }),
  });
  const requestWithChatNotFound = createRequestWithChatNotFound({
    requestWithDiag,
    chatId,
    input: to,
  });

  const durationSeconds = normalizedPoll.durationSeconds;
  if (durationSeconds === undefined && normalizedPoll.durationHours !== undefined) {
    throw new Error(
      "Telegram poll durationHours is not supported. Use durationSeconds (5-600) instead.",
    );
  }
  if (durationSeconds !== undefined && (durationSeconds < 5 || durationSeconds > 600)) {
    throw new Error("Telegram poll durationSeconds must be between 5 and 600");
  }

  const pollParams = {
    allows_multiple_answers: normalizedPoll.maxSelections > 1,
    is_anonymous: opts.isAnonymous ?? true,
    ...(durationSeconds !== undefined ? { open_period: durationSeconds } : {}),
    ...(Object.keys(threadParams).length > 0 ? threadParams : {}),
    ...(opts.silent === true ? { disable_notification: true } : {}),
  };

  const result = await withTelegramThreadFallback(
    pollParams,
    "poll",
    opts.verbose,
    async (effectiveParams, label) =>
      requestWithChatNotFound(
        () => api.sendPoll(chatId, normalizedPoll.question, pollOptions, effectiveParams),
        label,
      ),
  );

  const messageId = String(result?.message_id ?? "unknown");
  const resolvedChatId = String(result?.chat?.id ?? chatId);
  const pollId = result?.poll?.id;
  if (result?.message_id) {
    recordSentMessage(chatId, result.message_id);
  }

  recordChannelActivity({
    channel: "telegram",
    accountId: account.accountId,
    direction: "outbound",
  });

  return { messageId, chatId: resolvedChatId, pollId };
}
