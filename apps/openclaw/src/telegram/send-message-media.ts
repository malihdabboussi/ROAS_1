import type { InlineKeyboardMarkup } from "@grammyjs/types";
import { Bot, InputFile } from "grammy";
import type { ResolvedTelegramAccount } from "./accounts.js";
import type {
  TelegramMessageLike,
  TelegramSendOpts,
  TelegramSendResult,
} from "./send-message-types.js";
import { logVerbose } from "../globals.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { mediaKindFromMime } from "../media/constants.js";
import { isGifMedia } from "../media/mime.js";
import { loadWebMedia } from "../web/media.js";
import { splitTelegramCaption } from "./caption.js";
import { inferFilename, withTelegramThreadFallback } from "./send-utils.js";
import { recordSentMessage } from "./sent-message-cache.js";
import { resolveTelegramVoiceSend } from "./voice.js";

type SendTelegramTextFn = (
  rawText: string,
  params?: Record<string, unknown>,
  fallbackText?: string,
) => Promise<TelegramMessageLike>;

export async function sendTelegramMediaBranch(params: {
  api: Bot["api"];
  chatId: string;
  text: string;
  opts: TelegramSendOpts;
  account: ResolvedTelegramAccount;
  threadParams: Record<string, unknown>;
  hasThreadParams: boolean;
  replyMarkup: InlineKeyboardMarkup | undefined;
  requestWithChatNotFound: <T>(fn: () => Promise<T>, label: string) => Promise<T>;
  renderHtmlText: (value: string) => string;
  sendTelegramText: SendTelegramTextFn;
  verbose: boolean | undefined;
}): Promise<TelegramSendResult> {
  const {
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
  } = params;

  const mediaUrl = opts.mediaUrl?.trim();
  if (!mediaUrl) {
    throw new Error("sendTelegramMediaBranch requires mediaUrl");
  }

  const media = await loadWebMedia(mediaUrl, {
    maxBytes: opts.maxBytes,
    localRoots: opts.mediaLocalRoots,
  });
  const kind = mediaKindFromMime(media.contentType ?? undefined);
  const isGif = isGifMedia({
    contentType: media.contentType,
    fileName: media.fileName,
  });
  const isVideoNote = kind === "video" && opts.asVideoNote === true;
  const fileName = media.fileName ?? (isGif ? "animation.gif" : inferFilename(kind)) ?? "file";
  const file = new InputFile(media.buffer, fileName);
  let caption: string | undefined;
  let followUpText: string | undefined;

  if (isVideoNote) {
    caption = undefined;
    followUpText = text.trim() ? text : undefined;
  } else {
    const split = splitTelegramCaption(text);
    caption = split.caption;
    followUpText = split.followUpText;
  }
  const htmlCaption = caption ? renderHtmlText(caption) : undefined;
  const needsSeparateText = Boolean(followUpText);
  const baseMediaParams = {
    ...(hasThreadParams ? threadParams : {}),
    ...(!needsSeparateText && replyMarkup ? { reply_markup: replyMarkup } : {}),
  };
  const mediaParams = {
    ...(htmlCaption ? { caption: htmlCaption, parse_mode: "HTML" as const } : {}),
    ...baseMediaParams,
    ...(opts.silent === true ? { disable_notification: true } : {}),
  };
  const sendMedia = async (
    label: string,
    sender: (effectiveParams: Record<string, unknown> | undefined) => Promise<TelegramMessageLike>,
  ) =>
    await withTelegramThreadFallback(
      mediaParams,
      label,
      opts.verbose,
      async (effectiveParams, retryLabel) =>
        requestWithChatNotFound(() => sender(effectiveParams), retryLabel),
    );

  const mediaSender = (() => {
    if (isGif) {
      return {
        label: "animation",
        sender: (effectiveParams: Record<string, unknown> | undefined) =>
          api.sendAnimation(
            chatId,
            file,
            effectiveParams as Parameters<typeof api.sendAnimation>[2],
          ) as Promise<TelegramMessageLike>,
      };
    }
    if (kind === "image") {
      return {
        label: "photo",
        sender: (effectiveParams: Record<string, unknown> | undefined) =>
          api.sendPhoto(
            chatId,
            file,
            effectiveParams as Parameters<typeof api.sendPhoto>[2],
          ) as Promise<TelegramMessageLike>,
      };
    }
    if (kind === "video") {
      if (isVideoNote) {
        return {
          label: "video_note",
          sender: (effectiveParams: Record<string, unknown> | undefined) =>
            api.sendVideoNote(
              chatId,
              file,
              effectiveParams as Parameters<typeof api.sendVideoNote>[2],
            ) as Promise<TelegramMessageLike>,
        };
      }
      return {
        label: "video",
        sender: (effectiveParams: Record<string, unknown> | undefined) =>
          api.sendVideo(
            chatId,
            file,
            effectiveParams as Parameters<typeof api.sendVideo>[2],
          ) as Promise<TelegramMessageLike>,
      };
    }
    if (kind === "audio") {
      const { useVoice } = resolveTelegramVoiceSend({
        wantsVoice: opts.asVoice === true,
        contentType: media.contentType,
        fileName,
        logFallback: logVerbose,
      });
      if (useVoice) {
        return {
          label: "voice",
          sender: (effectiveParams: Record<string, unknown> | undefined) =>
            api.sendVoice(
              chatId,
              file,
              effectiveParams as Parameters<typeof api.sendVoice>[2],
            ) as Promise<TelegramMessageLike>,
        };
      }
      return {
        label: "audio",
        sender: (effectiveParams: Record<string, unknown> | undefined) =>
          api.sendAudio(
            chatId,
            file,
            effectiveParams as Parameters<typeof api.sendAudio>[2],
          ) as Promise<TelegramMessageLike>,
      };
    }
    return {
      label: "document",
      sender: (effectiveParams: Record<string, unknown> | undefined) =>
        api.sendDocument(
          chatId,
          file,
          effectiveParams as Parameters<typeof api.sendDocument>[2],
        ) as Promise<TelegramMessageLike>,
    };
  })();

  const result = await sendMedia(mediaSender.label, mediaSender.sender);
  const mediaMessageId = String(result?.message_id ?? "unknown");
  const resolvedChatId = String(result?.chat?.id ?? chatId);
  if (result?.message_id) {
    recordSentMessage(chatId, result.message_id);
  }
  recordChannelActivity({
    channel: "telegram",
    accountId: account.accountId,
    direction: "outbound",
  });

  if (needsSeparateText && followUpText) {
    const textParams =
      hasThreadParams || replyMarkup
        ? {
            ...threadParams,
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }
        : undefined;
    const textRes = await sendTelegramText(followUpText, textParams);
    return {
      messageId: String(textRes?.message_id ?? mediaMessageId),
      chatId: resolvedChatId,
    };
  }

  return { messageId: mediaMessageId, chatId: resolvedChatId };
}
