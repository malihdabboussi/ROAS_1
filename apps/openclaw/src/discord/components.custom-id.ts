import { parseCustomId, type ComponentParserResult } from "@buape/carbon";
import {
  DISCORD_COMPONENT_CUSTOM_ID_KEY,
  DISCORD_MODAL_CUSTOM_ID_KEY,
} from "./components.types.js";

export function buildDiscordComponentCustomId(params: {
  componentId: string;
  modalId?: string;
}): string {
  const base = `${DISCORD_COMPONENT_CUSTOM_ID_KEY}:cid=${params.componentId}`;
  return params.modalId ? `${base};mid=${params.modalId}` : base;
}

export function buildDiscordModalCustomId(modalId: string): string {
  return `${DISCORD_MODAL_CUSTOM_ID_KEY}:mid=${modalId}`;
}

export function parseDiscordComponentCustomId(
  id: string,
): { componentId: string; modalId?: string } | null {
  const parsed = parseCustomId(id);
  if (parsed.key !== DISCORD_COMPONENT_CUSTOM_ID_KEY) {
    return null;
  }
  const componentId = parsed.data.cid;
  if (typeof componentId !== "string" || !componentId.trim()) {
    return null;
  }
  const modalId = parsed.data.mid;
  return {
    componentId,
    modalId: typeof modalId === "string" && modalId.trim() ? modalId : undefined,
  };
}

export function parseDiscordModalCustomId(id: string): string | null {
  const parsed = parseCustomId(id);
  if (parsed.key !== DISCORD_MODAL_CUSTOM_ID_KEY) {
    return null;
  }
  const modalId = parsed.data.mid;
  if (typeof modalId !== "string" || !modalId.trim()) {
    return null;
  }
  return modalId;
}

export function parseDiscordComponentCustomIdForCarbon(id: string): ComponentParserResult {
  if (id === "*") {
    return { key: "*", data: {} };
  }
  const parsed = parseCustomId(id);
  if (parsed.key !== DISCORD_COMPONENT_CUSTOM_ID_KEY) {
    return parsed;
  }
  return { key: "*", data: parsed.data };
}

export function parseDiscordModalCustomIdForCarbon(id: string): ComponentParserResult {
  if (id === "*") {
    return { key: "*", data: {} };
  }
  const parsed = parseCustomId(id);
  if (parsed.key !== DISCORD_MODAL_CUSTOM_ID_KEY) {
    return parsed;
  }
  return { key: "*", data: parsed.data };
}
