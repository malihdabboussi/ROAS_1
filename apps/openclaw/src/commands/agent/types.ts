import type { ClientToolDefinition } from "../../agents/pi-embedded-runner/run/params.js";
import type { ExternalSkillCatalog } from "../../agents/skills.js";
import type { ChannelOutboundTargetMode } from "../../channels/plugins/types.js";
import type { InputProvenance } from "../../sessions/input-provenance.js";

/** Image content block for Claude API multimodal messages. */
export type ImageContent = {
  type: "image";
  data: string;
  mimeType: string;
};

export type AgentStreamParams = {
  /** Provider stream params override (best-effort). */
  temperature?: number;
  maxTokens?: number;
};

export type RuntimeCredential = {
  provider: string;
  accessToken: string;
};

export type AgentRunContext = {
  messageChannel?: string;
  accountId?: string;
  groupId?: string | null;
  groupChannel?: string | null;
  groupSpace?: string | null;
  currentChannelId?: string;
  currentThreadTs?: string;
  replyToMode?: "off" | "first" | "all";
  hasRepliedRef?: { value: boolean };
};

export type AgentCommandOpts = {
  message: string;
  /** Optional image attachments for multimodal messages. */
  images?: ImageContent[];
  /** Optional client-provided tools (OpenResponses hosted tools). */
  clientTools?: ClientToolDefinition[];
  /** Optional integration toolkit IDs allowed for this run. */
  enabledToolkits?: string[];
  /** Optional native Vibey backend actions disabled for this run. */
  disabledNativeActions?: string[];
  /** Optional DB-backed skill metadata catalog for this run. */
  skillCatalog?: ExternalSkillCatalog;
  /** Agent id override (must exist in config). */
  agentId?: string;
  to?: string;
  sessionId?: string;
  sessionKey?: string;
  thinking?: string;
  thinkingOnce?: string;
  verbose?: string;
  json?: boolean;
  timeout?: string;
  deliver?: boolean;
  /** Override delivery target (separate from session routing). */
  replyTo?: string;
  /** Override delivery channel (separate from session routing). */
  replyChannel?: string;
  /** Override delivery account id (separate from session routing). */
  replyAccountId?: string;
  /** Override delivery thread/topic id (separate from session routing). */
  threadId?: string | number;
  /** Message channel context (webchat|voicewake|whatsapp|...). */
  messageChannel?: string;
  channel?: string; // delivery channel (whatsapp|telegram|...)
  /** Account ID for multi-account channel routing (e.g., WhatsApp account). */
  accountId?: string;
  /** Context for embedded run routing (channel/account/thread). */
  runContext?: AgentRunContext;
  /** Group id for channel-level tool policy resolution. */
  groupId?: string | null;
  /** Group channel label for channel-level tool policy resolution. */
  groupChannel?: string | null;
  /** Group space label for channel-level tool policy resolution. */
  groupSpace?: string | null;
  /** Parent session key for subagent policy inheritance. */
  spawnedBy?: string | null;
  deliveryTargetMode?: ChannelOutboundTargetMode;
  bestEffortDeliver?: boolean;
  abortSignal?: AbortSignal;
  lane?: string;
  runId?: string;
  extraSystemPrompt?: string;
  inputProvenance?: InputProvenance;
  /** Per-call stream param overrides (best-effort). */
  streamParams?: AgentStreamParams;
  /** Per-request context window cap for prompt budgeting. */
  contextTokensOverride?: number;
  /** Per-request model override (e.g. "anthropic/claude-opus-4.6"). Bypasses config default. */
  modelOverride?: string;
  /** Per-request provider credentials supplied by a trusted gateway caller. */
  runtimeCredentials?: RuntimeCredential[];
  /** When true, do not spend fallback provider tokens if the selected model fails. */
  disableModelFallbacks?: boolean;
  /** Per-request reasoning level override (e.g. "stream"). Sets session reasoningLevel for this run. */
  reasoningLevel?: string;
  /** Optional suffix for identity files (e.g. "-CEO" loads SOUL-CEO.md instead of SOUL.md). */
  identitySuffix?: string;
  /** When true, skip all sessions.json reads/writes (in-memory session store only). */
  skipSessionPersistence?: boolean;
};
