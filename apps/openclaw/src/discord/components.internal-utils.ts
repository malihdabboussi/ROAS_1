import { ButtonStyle, TextInputStyle } from "discord-api-types/v10";
import crypto from "node:crypto";
import {
  DISCORD_COMPONENT_ATTACHMENT_PREFIX,
  type DiscordComponentBlock,
  type DiscordComponentButtonStyle,
  type DiscordModalFieldSpec,
} from "./components.types.js";

export const BLOCK_ALIASES = new Map<string, DiscordComponentBlock["type"]>([
  ["row", "actions"],
  ["action-row", "actions"],
]);

export function createShortId(prefix: string) {
  return `${prefix}${crypto.randomBytes(6).toString("base64url")}`;
}

export function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function readString(value: unknown, label: string, opts?: { allowEmpty?: boolean }): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!opts?.allowEmpty && !trimmed) {
    throw new Error(`${label} cannot be empty`);
  }
  return opts?.allowEmpty ? value : trimmed;
}

export function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

export function normalizeModalFieldName(value: string | undefined, index: number) {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `field_${index + 1}`;
}

export function normalizeAttachmentRef(value: string, label: string): `attachment://${string}` {
  const trimmed = value.trim();
  if (!trimmed.startsWith(DISCORD_COMPONENT_ATTACHMENT_PREFIX)) {
    throw new Error(`${label} must start with "${DISCORD_COMPONENT_ATTACHMENT_PREFIX}"`);
  }
  const attachmentName = trimmed.slice(DISCORD_COMPONENT_ATTACHMENT_PREFIX.length).trim();
  if (!attachmentName) {
    throw new Error(`${label} must include an attachment filename`);
  }
  return `${DISCORD_COMPONENT_ATTACHMENT_PREFIX}${attachmentName}`;
}

export function mapButtonStyle(style?: DiscordComponentButtonStyle): ButtonStyle {
  switch ((style ?? "primary").toLowerCase()) {
    case "secondary":
      return ButtonStyle.Secondary;
    case "success":
      return ButtonStyle.Success;
    case "danger":
      return ButtonStyle.Danger;
    case "link":
      return ButtonStyle.Link;
    case "primary":
    default:
      return ButtonStyle.Primary;
  }
}

export function mapTextInputStyle(style?: DiscordModalFieldSpec["style"]) {
  return style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short;
}

export function normalizeBlockType(raw: string) {
  const lowered = raw.trim().toLowerCase();
  return BLOCK_ALIASES.get(lowered) ?? (lowered as DiscordComponentBlock["type"]);
}
