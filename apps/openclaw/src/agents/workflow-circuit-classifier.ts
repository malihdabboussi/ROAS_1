import { createHash } from "node:crypto";
import { normalizeToolName } from "./tool-policy.js";

export type WorkflowClass =
  | "integration_access"
  | "file_ingestion"
  | "workspace_file_write"
  | "media_processing"
  | "presentation_render"
  | "artifact_publish"
  | "artifact_export"
  | "artifact_mutation"
  | "artifact_read"
  | "image_analysis"
  | "video_analysis"
  | "memory_read"
  | "memory_save"
  | "brain_campaign_read"
  | "brain_agent_read"
  | "brain_company_read"
  | "brain_customer_read"
  | "mcp_execution"
  | "database_execution"
  | "message_delivery"
  | "agent_delegation"
  | "browser_execution"
  | "command_execution"
  | "unknown_workflow";

export type VerifiedRecoveryOption = {
  label: string;
  requires_user_choice: boolean;
};

type WorkflowToolInput = {
  toolName: string;
  action?: string;
  params?: unknown;
};

const READ_PREFIX_RE =
  /^(describe|get|list|read|search|show|check|validate|summarize|extract|answer|compare|evaluate|audit)_/;
const WRITE_PREFIX_RE =
  /^(create|update|delete|save|patch|add|attach|detach|write|set|upsert|archive|merge|connect|disconnect|assign|unassign|approve|activate|compile|import|bulk|retry|reassign|define|log|resolve|transfer)_/;
const PUBLISH_PREFIX_RE = /^(publish|unpublish|schedule|send|prepare_.*send|create_calendar_event)/;
const SENSITIVE_KEY_RE =
  /(token|password|secret|authorization|api[_-]?key|refresh|access[_-]?token|cookie)/i;
const LARGE_TEXT_KEY_RE = /(content|html|tsx|jsx|css|script|body|prompt|text|base64|data_url)/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeAction(action: string | undefined): string | undefined {
  const normalized = action?.trim().replace(/-/g, "_").toLowerCase();
  return normalized || undefined;
}

export function resolveWorkflowToolAction(input: WorkflowToolInput): string | undefined {
  const direct = normalizeAction(input.action);
  if (direct) return direct;
  const params = asRecord(input.params);
  return normalizeAction(typeof params?.action === "string" ? params.action : undefined);
}

function classifyNativeTool(toolName: string, action?: string): WorkflowClass {
  if (toolName === "read" || toolName === "read_document") return "file_ingestion";
  if (toolName === "write" || toolName === "edit" || toolName === "apply_patch") {
    return "workspace_file_write";
  }
  if (toolName === "exec" || toolName === "process") return "command_execution";
  if (toolName === "browser" || toolName === "web_search" || toolName === "web_fetch") {
    return "browser_execution";
  }
  if (toolName === "image") return action?.includes("video") ? "video_analysis" : "image_analysis";
  if (toolName === "tts" || toolName === "nano-banana-pro") return "media_processing";
  if (toolName === "message") return "message_delivery";
  if (toolName === "gateway" || toolName.startsWith("mcp")) return "mcp_execution";
  if (toolName === "memory_search" || toolName === "memory_get") return "memory_read";
  if (toolName === "canvas" || toolName === "nodes") return "artifact_mutation";
  if (toolName === "cron") return "artifact_publish";
  if (
    toolName === "agents_list" ||
    toolName === "session_status" ||
    toolName === "subagents" ||
    toolName.startsWith("sessions_")
  ) {
    return "agent_delegation";
  }
  return action ? classifyGenericAction(action, undefined) : "unknown_workflow";
}

function classifyGenericAction(action: string, params: unknown): WorkflowClass {
  const payloadText = JSON.stringify(redactPayload(params)).toLowerCase();
  if (action.startsWith("supabase_")) return "database_execution";
  if (action.includes("integration") || action.includes("composio") || action.includes("oauth")) {
    return "integration_access";
  }
  if (action.includes("mcp")) return "mcp_execution";
  if (
    action.includes("memory") ||
    action.includes("brain") ||
    action.includes("cortex") ||
    action.includes("fathom") ||
    action.includes("fireflies")
  ) {
    // Keep campaign / agent / company / customer brain reads in separate
    // circuit classes so wrong-family read failures cannot open a circuit
    // that blocks the correct family (e.g. search_agent_brain ≠ search_campaign_brain).
    const isBrainRead =
      /^(search|get|list|read|resolve|describe|check|show|validate)_/.test(action) ||
      action === "list_available_brain_scopes";
    if (isBrainRead) {
      if (action.includes("campaign")) return "brain_campaign_read";
      if (action.includes("agent")) return "brain_agent_read";
      if (action.includes("company") || action.includes("cortex")) return "brain_company_read";
      if (action.includes("customer")) return "brain_customer_read";
      return "memory_read";
    }
    return "memory_save";
  }
  if (action.includes("video")) return "video_analysis";
  if (action === "analyze_image") return "image_analysis";
  if (
    action.includes("media") ||
    action.includes("asset") ||
    action.includes("audio") ||
    action.includes("image")
  ) {
    return "media_processing";
  }
  if (
    action.includes("presentation") ||
    action === "generate_visual_html" ||
    action === "show_presentation_file" ||
    ((action === "create_pdf" || action === "create_docx") &&
      (payloadText.includes("presentation") || payloadText.includes("slide")))
  ) {
    return "presentation_render";
  }
  if (action === "create_pdf" || action === "create_docx" || action.includes("export")) {
    return "artifact_export";
  }
  if (PUBLISH_PREFIX_RE.test(action)) {
    return action === "send_user_message" ? "message_delivery" : "artifact_publish";
  }
  if (action.includes("agent") || action.includes("mission") || action.includes("delegate")) {
    return "agent_delegation";
  }
  if (
    action.includes("funnel") ||
    action.includes("website") ||
    action.includes("space") ||
    action.includes("file") ||
    action.includes("doc") ||
    action.includes("page") ||
    action.includes("form") ||
    action.includes("object") ||
    action.includes("offer") ||
    action.includes("sequence") ||
    action.includes("email") ||
    action.includes("ad") ||
    action.includes("social") ||
    action.includes("blog") ||
    action.includes("canvas") ||
    action.includes("dashboard") ||
    action.includes("report")
  ) {
    return READ_PREFIX_RE.test(action) ? "artifact_read" : "artifact_mutation";
  }
  if (READ_PREFIX_RE.test(action)) return "artifact_read";
  if (WRITE_PREFIX_RE.test(action)) return "artifact_mutation";
  return "artifact_mutation";
}

export function resolveWorkflowClass(input: WorkflowToolInput): WorkflowClass {
  const toolName = normalizeToolName(input.toolName || "tool");
  const action = resolveWorkflowToolAction(input);
  if (toolName === "vibey_backend" || toolName === "campaign_capability") {
    return action ? classifyGenericAction(action, input.params) : "artifact_mutation";
  }
  return classifyNativeTool(toolName, action);
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function redactPayload(value: unknown, key = "", depth = 0): unknown {
  if (depth > 6) return "[depth-limit]";
  if (typeof value === "string") {
    if (SENSITIVE_KEY_RE.test(key)) return "[redacted]";
    if (LARGE_TEXT_KEY_RE.test(key) || value.length > 180) {
      return `[string:${value.length}:${shortHash(value)}]`;
    }
    return value;
  }
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) {
    return {
      length: value.length,
      items: value.slice(0, 20).map((entry) => redactPayload(entry, key, depth + 1)),
    };
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([childKey, childValue]) => [childKey, redactPayload(childValue, childKey, depth + 1)]),
  );
}

export function buildWorkflowPayloadFingerprint(input: WorkflowToolInput): string {
  const payload = {
    action: resolveWorkflowToolAction(input),
    params: redactPayload(input.params),
    tool: normalizeToolName(input.toolName || "tool"),
  };
  return shortHash(JSON.stringify(payload));
}

export function resolveVerifiedRecoveryOptions(
  workflowClass: WorkflowClass,
): VerifiedRecoveryOption[] {
  if (workflowClass === "presentation_render" || workflowClass === "artifact_export") {
    return [
      {
        label: "Continue editing the source content without another render attempt.",
        requires_user_choice: false,
      },
      {
        label: "Ask the user to choose another already verified output path.",
        requires_user_choice: true,
      },
    ];
  }
  if (workflowClass === "artifact_publish" || workflowClass === "message_delivery") {
    return [
      { label: "Keep the saved draft state if it already exists.", requires_user_choice: false },
      { label: "Ask the user before trying another delivery channel.", requires_user_choice: true },
    ];
  }
  if (
    workflowClass === "brain_agent_read" ||
    workflowClass === "brain_company_read" ||
    workflowClass === "brain_customer_read" ||
    workflowClass === "memory_read"
  ) {
    return [
      {
        label:
          "For client/campaign package knowledge, call search_campaign_brain with the campaign_id (separate circuit from agent/user/company brain reads).",
        requires_user_choice: false,
      },
      {
        label: "Ask the user which verified brain or document path to use next.",
        requires_user_choice: true,
      },
    ];
  }
  if (workflowClass === "brain_campaign_read") {
    return [
      {
        label: "Confirm the conversation is scoped to the client campaign or pass an explicit campaign_id.",
        requires_user_choice: false,
      },
      {
        label: "Ask the user which verified path to use next.",
        requires_user_choice: true,
      },
    ];
  }
  return [
    {
      label: "Continue with work that does not depend on this workflow.",
      requires_user_choice: false,
    },
    { label: "Ask the user which verified path to use next.", requires_user_choice: true },
  ];
}
