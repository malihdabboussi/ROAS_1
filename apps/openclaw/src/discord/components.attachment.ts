import { DISCORD_COMPONENT_ATTACHMENT_PREFIX } from "./components.types.js";

export function resolveDiscordComponentAttachmentName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith(DISCORD_COMPONENT_ATTACHMENT_PREFIX)) {
    throw new Error(
      `Attachment reference must start with "${DISCORD_COMPONENT_ATTACHMENT_PREFIX}"`,
    );
  }
  const attachmentName = trimmed.slice(DISCORD_COMPONENT_ATTACHMENT_PREFIX.length).trim();
  if (!attachmentName) {
    throw new Error("Attachment reference must include a filename");
  }
  return attachmentName;
}
