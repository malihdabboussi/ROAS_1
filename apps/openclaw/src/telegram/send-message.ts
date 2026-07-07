import { Bot } from "grammy";
import type {
  TelegramMessageLike,
  TelegramSendOpts,
  TelegramSendResult,
} from "./send-message-types.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { renderTelegramHtmlText } from "./format.js";
import { isRecoverableTelegramNetworkError } from "./network-errors.js";
import {
  createRequestWithChatNotFound,
  createTelegramRequestWithDiag,
  resolveTelegramApiContext,
} from "./send-client.js";
import { buildInlineKeyboard } from "./send-keyboard.js";
import { sendTelegramMediaBranch } from "./send-message-media.js";
import {
  buildTelegramThreadReplyParams,
  normalizeChatId,
  withTelegramHtmlParseFallback,
  withTelegramThreadFallback,
} from "./send-utils.js";
import { recordSentMessage } from "./sent-message-cache.js";
import { parseTelegramTarget } from "./targets.js";

export async function sendMessageTelegram(
  to: string,
  text: string,
  opts: TelegramSendOpts = {},
): Promise<TelegramSendResult> {
  const { cfg, account, api } = resolveTelegramApiContext(opts);
  const target = parseTelegramTarget(to);
  const chatId = normalizeChatId(target.chatId);
  const mediaUrl = opts.mediaUrl?.trim();
  const replyMarkup = buildInlineKeyboard(opts.buttons);

  const threadParams = buildTelegramThreadReplyParams({
    targetMessageThreadId: target.messageThreadId,
    messageThreadId: opts.messageThreadId,
    replyToMessageId: opts.replyToMessageId,
    quoteText: opts.quoteText,
  });
  const hasThreadParams = Object.keys(threadParams).length > 0;
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

  const textMode = opts.textMode ?? "markdown";
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
  });
  const renderHtmlText = (value: string) => renderTelegramHtmlText(value, { textMode, tableMode });

  const linkPreviewEnabled = account.config.linkPreview ?? true;
  const linkPreviewOptions = linkPreviewEnabled ? undefined : { is_disabled: true };

  const sendTelegramText = async (
    rawText: string,
    params?: Record<string, unknown>,
    fallbackText?: string,
  ) => {
    return await withTelegramThreadFallback(
      params,
      "message",
      opts.verbose,
      async (effectiveParams, label) => {
        const htmlText = renderHtmlText(rawText);
        const baseParams = effectiveParams ? { ...effectiveParams } : {};
        if (linkPreviewOptions) {
          baseParams.link_preview_options = linkPreviewOptions;
        }
        const hasBaseParams = Object.keys(baseParams).length > 0;
        const sendParams = {
          parse_mode: "HTML" as const,
          ...baseParams,
          ...(opts.silent === true ? { disable_notification: true } : {}),
        };
        return await withTelegramHtmlParseFallback({
          label,
          verbose: opts.verbose,
          requestHtml: (retryLabel) =>
            requestWithChatNotFound(
              () =>
                api.sendMessage(
                  chatId,
                  htmlText,
                  sendParams as Parameters<Bot["api"]["sendMessage"]>[2],
                ),
              retryLabel,
            ),
          requestPlain: (retryLabel) => {
            const plainParams = hasBaseParams
              ? (baseParams as Parameters<Bot["api"]["sendMessage"]>[2])
              : undefined;
            return requestWithChatNotFound(
              () =>
                plainParams
                  ? api.sendMessage(chatId, fallbackText ?? rawText, plainParams)
                  : api.sendMessage(chatId, fallbackText ?? rawText),
              retryLabel,
            );
          },
        });
      },
    );
  };

  if (mediaUrl) {
    return sendTelegramMediaBranch({
      api,
      chatId,
      text,
      opts,
      account,
      threadParams,
      hasThreadParams,
      replyMarkup,
      requestWithChatNotFound,
      renderHtmlText,
      sendTelegramText,
      verbose: opts.verbose,
    });
  }

  if (!text || !text.trim()) {
    throw new Error("Message must be non-empty for Telegram sends");
  }
  const textParams =
    hasThreadParams || replyMarkup
      ? {
          ...threadParams,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }
      : undefined;
  const res = (await sendTelegramText(text, textParams, opts.plainText)) as TelegramMessageLike;
  const messageId = String(res?.message_id ?? "unknown");
  if (res?.message_id) {
    recordSentMessage(chatId, res.message_id);
  }
  recordChannelActivity({
    channel: "telegram",
    accountId: account.accountId,
    direction: "outbound",
  });
  return { messageId, chatId: String(res?.chat?.id ?? chatId) };
}
