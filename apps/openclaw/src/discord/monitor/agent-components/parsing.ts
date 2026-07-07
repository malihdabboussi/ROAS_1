import type { ComponentData } from "@buape/carbon";
import type { AgentComponentInteraction } from "./context.js";
import { parseDiscordComponentCustomId, parseDiscordModalCustomId } from "../../components.js";

/**
 * Parse agent component data from Carbon's parsed ComponentData
 * Carbon parses "key:componentId=xxx" into { componentId: "xxx" }
 */
export function parseAgentComponentData(data: ComponentData): {
  componentId: string;
} | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const componentId =
    typeof data.componentId === "string"
      ? decodeURIComponent(data.componentId)
      : typeof data.componentId === "number"
        ? String(data.componentId)
        : null;
  if (!componentId) {
    return null;
  }
  return { componentId };
}

function normalizeComponentId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

export function parseDiscordComponentData(
  data: ComponentData,
  customId?: string,
): { componentId: string; modalId?: string } | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const rawComponentId =
    "cid" in data
      ? (data as { cid?: unknown }).cid
      : (data as { componentId?: unknown }).componentId;
  const rawModalId =
    "mid" in data ? (data as { mid?: unknown }).mid : (data as { modalId?: unknown }).modalId;
  let componentId = normalizeComponentId(rawComponentId);
  let modalId = normalizeComponentId(rawModalId);
  if (!componentId && customId) {
    const parsed = parseDiscordComponentCustomId(customId);
    if (parsed) {
      componentId = parsed.componentId;
      modalId = parsed.modalId;
    }
  }
  if (!componentId) {
    return null;
  }
  return { componentId, modalId };
}

export function parseDiscordModalId(data: ComponentData, customId?: string): string | null {
  if (data && typeof data === "object") {
    const rawModalId =
      "mid" in data ? (data as { mid?: unknown }).mid : (data as { modalId?: unknown }).modalId;
    const modalId = normalizeComponentId(rawModalId);
    if (modalId) {
      return modalId;
    }
  }
  if (customId) {
    return parseDiscordModalCustomId(customId);
  }
  return null;
}

export function resolveInteractionCustomId(
  interaction: AgentComponentInteraction,
): string | undefined {
  if (!interaction?.rawData || typeof interaction.rawData !== "object") {
    return undefined;
  }
  if (!("data" in interaction.rawData)) {
    return undefined;
  }
  const data = (interaction.rawData as { data?: { custom_id?: unknown } }).data;
  const customId = data?.custom_id;
  if (typeof customId !== "string") {
    return undefined;
  }
  const trimmed = customId.trim();
  return trimmed ? trimmed : undefined;
}
