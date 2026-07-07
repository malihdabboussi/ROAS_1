import type { Bot } from "grammy";
import type { RetryConfig } from "../infra/retry.js";

export type TelegramSendOpts = {
  token?: string;
  accountId?: string;
  verbose?: boolean;
  mediaUrl?: string;
  mediaLocalRoots?: readonly string[];
  maxBytes?: number;
  api?: Bot["api"];
  retry?: RetryConfig;
  textMode?: "markdown" | "html";
  plainText?: string;
  asVoice?: boolean;
  asVideoNote?: boolean;
  silent?: boolean;
  replyToMessageId?: number;
  quoteText?: string;
  messageThreadId?: number;
  buttons?: Array<Array<{ text: string; callback_data: string }>>;
};

export type TelegramSendResult = {
  messageId: string;
  chatId: string;
};

export type TelegramMessageLike = {
  message_id?: number;
  chat?: { id?: string | number };
};
