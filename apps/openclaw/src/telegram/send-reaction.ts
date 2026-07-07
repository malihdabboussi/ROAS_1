import type { ReactionType, ReactionTypeEmoji } from "@grammyjs/types";
import { Bot } from "grammy";
import type { RetryConfig } from "../infra/retry.js";
import { isRecoverableTelegramNetworkError } from "./network-errors.js";
import { createTelegramRequestWithDiag, resolveTelegramApiContext } from "./send-client.js";
import { normalizeChatId, normalizeMessageId } from "./send-utils.js";

type TelegramReactionOpts = {
  token?: string;
  accountId?: string;
  api?: Bot["api"];
  remove?: boolean;
  verbose?: boolean;
  retry?: RetryConfig;
};

export async function reactMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  emoji: string,
  opts: TelegramReactionOpts = {},
): Promise<{ ok: true } | { ok: false; warning: string }> {
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
  const remove = opts.remove === true;
  const trimmedEmoji = emoji.trim();
  const reactions: ReactionType[] =
    remove || !trimmedEmoji
      ? []
      : [{ type: "emoji", emoji: trimmedEmoji as ReactionTypeEmoji["emoji"] }];
  if (typeof api.setMessageReaction !== "function") {
    throw new Error("Telegram reactions are unavailable in this bot API.");
  }
  try {
    await requestWithDiag(() => api.setMessageReaction(chatId, messageId, reactions), "reaction");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/REACTION_INVALID/i.test(msg)) {
      return { ok: false as const, warning: `Reaction unavailable: ${trimmedEmoji}` };
    }
    throw err;
  }
  return { ok: true };
}
