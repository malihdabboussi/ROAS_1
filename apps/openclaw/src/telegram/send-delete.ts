import { Bot } from "grammy";
import type { RetryConfig } from "../infra/retry.js";
import { logVerbose } from "../globals.js";
import { isRecoverableTelegramNetworkError } from "./network-errors.js";
import { createTelegramRequestWithDiag, resolveTelegramApiContext } from "./send-client.js";
import { normalizeChatId, normalizeMessageId } from "./send-utils.js";

type TelegramDeleteOpts = {
  token?: string;
  accountId?: string;
  verbose?: boolean;
  api?: Bot["api"];
  retry?: RetryConfig;
};

export async function deleteMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  opts: TelegramDeleteOpts = {},
): Promise<{ ok: true }> {
  const { cfg, account, api } = resolveTelegramApiContext(opts);
  const chatId = normalizeChatId(String(chatIdInput));
  const messageId = normalizeMessageId(messageIdInput);
  const requestWithDiag = createTelegramRequestWithDiag({
    cfg,
    account,
    retry: opts.retry,
    verbose: opts.verbose,
    shouldRetry: (err) => isRecoverableTelegramNetworkError(err, { context: "send" }),
  });
  await requestWithDiag(() => api.deleteMessage(chatId, messageId), "deleteMessage");
  logVerbose(`[telegram] Deleted message ${messageId} from chat ${chatId}`);
  return { ok: true };
}
