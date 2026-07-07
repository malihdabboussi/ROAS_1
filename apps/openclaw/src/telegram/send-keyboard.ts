import type { InlineKeyboardButton, InlineKeyboardMarkup } from "@grammyjs/types";

export type TelegramInlineButtonRows =
  | Array<Array<{ text: string; callback_data: string }>>
  | undefined;

export function buildInlineKeyboard(
  buttons?: TelegramInlineButtonRows,
): InlineKeyboardMarkup | undefined {
  if (!buttons?.length) {
    return undefined;
  }
  const rows = buttons
    .map((row) =>
      row
        .filter((button) => button?.text && button?.callback_data)
        .map(
          (button): InlineKeyboardButton => ({
            text: button.text,
            callback_data: button.callback_data,
          }),
        ),
    )
    .filter((row) => row.length > 0);
  if (rows.length === 0) {
    return undefined;
  }
  return { inline_keyboard: rows };
}
