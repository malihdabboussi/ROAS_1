import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { Api, AssistantMessage, Model } from "@mariozechner/pi-ai";
import type { ThinkLevel } from "../../../auto-reply/thinking.js";
import type { SessionSystemPromptReport } from "../../../config/sessions/types.js";
import type { MessagingToolSend } from "../../pi-embedded-messaging.js";
import type { AuthStorage, ModelRegistry } from "../../pi-model-discovery.js";
import type { PlatformFailureEnvelope } from "../../platform-failure.js";
import type { ProviderGenerationSummary } from "../../provider-generation-summary.js";
import type { NormalizedUsage } from "../../usage.js";
import type { RunEmbeddedPiAgentParams } from "./params.js";

type EmbeddedRunAttemptBase = Omit<
  RunEmbeddedPiAgentParams,
  "provider" | "model" | "authProfileId" | "authProfileIdSource" | "thinkLevel" | "lane" | "enqueue"
>;

export type EmbeddedRunAttemptParams = EmbeddedRunAttemptBase & {
  provider: string;
  modelId: string;
  model: Model<Api>;
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
  thinkLevel: ThinkLevel;
};

export type EmbeddedRunAttemptResult = {
  aborted: boolean;
  timedOut: boolean;
  /** True if the timeout occurred while compaction was in progress or pending. */
  timedOutDuringCompaction: boolean;
  promptError: unknown;
  sessionIdUsed: string;
  systemPromptReport?: SessionSystemPromptReport;
  messagesSnapshot: AgentMessage[];
  assistantTexts: string[];
  toolMetas: Array<{ toolName: string; meta?: string }>;
  lastAssistant: AssistantMessage | undefined;
  lastToolError?: {
    toolName: string;
    meta?: string;
    error?: string;
    failure?: PlatformFailureEnvelope;
    userSafeMessage?: string;
    mutatingAction?: boolean;
    actionFingerprint?: string;
  };
  didSendViaMessagingTool: boolean;
  messagingToolSentTexts: string[];
  messagingToolSentTargets: MessagingToolSend[];
  cloudCodeAssistFormatError: boolean;
  attemptUsage?: NormalizedUsage;
  providerGenerations?: ProviderGenerationSummary[];
  compactionCount?: number;
  /** Client tool calls detected (OpenResponses hosted tools). */
  clientToolCalls?: Array<{ name: string; params: Record<string, unknown>; toolCallId: string }>;
};
