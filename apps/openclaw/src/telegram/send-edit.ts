import { Bot } from "grammy";
import type { RetryConfig } from "../infra/retry.js";
import { loadConfig } from "../config/config.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { logVerbose } from "../globals.js";
import { renderTelegramHtmlText } from "./format.js";
import { createTelegramRequestWithDiag, resolveTelegramApiContext } from "./send-client.js";
import { buildInlineKeyboard } from "./send-keyboard.js";
import {
  isTelegramMessageNotModifiedError,
  normalizeChatId,
  normalizeMessageId,
  withTelegramHtmlParseFallback,
} from "./send-utils.js";

type TelegramEditOpts = {
  token?: string;
  accountId?: string;
  verbose?: boolean;
  api?: Bot["api"];
  retry?: RetryConfig;
  textMode?: "markdown" | "html";
  linkPreview?: boolean;
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
  cfg?: ReturnType<typeof loadConfig>;
};

export async function editMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  text: string,
  opts: TelegramEditOpts = {},
): Promise<{ ok: true; messageId: string; chatId: string }> {
  const { cfg, account, api } = resolveTelegramApiContext({
    ...opts,
    cfg: opts.cfg,
  });
  const chatId = normalizeChatId(String(chatIdInput));
  const messageId = normalizeMessageId(messageIdInput);
  const requestWithDiag = createTelegramRequestWithDiag({
    cfg,
    account,
    retry: opts.retry,
    verbose: opts.verbose,
  });
  const requestWithEditShouldLog = <T>(
    fn: () => Promise<T>,
    label?: string,
    shouldLog?: (err: unknown) => boolean,
  ) => requestWithDiag(fn, label, shouldLog ? { shouldLog } : undefined);

  const textMode = opts.textMode ?? "markdown";
  const tableMode = resolveMarkdownTableMode({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
  });
  const htmlText = renderTelegramHtmlText(text, { textMode, tableMode });

  const shouldTouchButtons = opts.buttons !== undefined;
  const builtKeyboard = shouldTouchButtons ? buildInlineKeyboard(opts.buttons) : undefined;
  const replyMarkup = shouldTouchButtons ? (builtKeyboard ?? { inline_keyboard: [] }) : undefined;

  const editParams: Record<string, unknown> = {
    parse_mode: "HTML",
  };
  if (opts.linkPreview === false) {
    editParams.link_preview_options = { is_disabled: true };
  }
  if (replyMarkup !== undefined) {
    editParams.reply_markup = replyMarkup;
  }
  const plainParams: Record<string, unknown> = {};
  if (opts.linkPreview === false) {
    plainParams.link_preview_options = { is_disabled: true };
  }
  if (replyMarkup !== undefined) {
    plainParams.reply_markup = replyMarkup;
  }

  try {
    await withTelegramHtmlParseFallback({
      label: "editMessage",
      verbose: opts.verbose,
      requestHtml: (retryLabel) =>
        requestWithEditShouldLog(
          () => api.editMessageText(chatId, messageId, htmlText, editParams),
          retryLabel,
          (err) => !isTelegramMessageNotModifiedError(err),
        ),
      requestPlain: (retryLabel) =>
        requestWithEditShouldLog(
          () =>
            Object.keys(plainParams).length > 0
              ? api.editMessageText(chatId, messageId, text, plainParams)
              : api.editMessageText(chatId, messageId, text),
          retryLabel,
          (plainErr) => !isTelegramMessageNotModifiedError(plainErr),
        ),
    });
  } catch (err) {
    if (isTelegramMessageNotModifiedError(err)) {
      // no-op: Telegram reports message content unchanged, treat as success
    } else {
      throw err;
    }
  }

  logVerbose(`[telegram] Edited message ${messageId} in chat ${chatId}`);
  return { ok: true, messageId: String(messageId), chatId };
}
