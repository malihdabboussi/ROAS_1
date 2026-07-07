import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { completeSimple } from "@mariozechner/pi-ai";
import { estimateTokens, convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";
import { DEFAULT_CONTEXT_TOKENS } from "./defaults.js";
import { repairToolUseResultPairing, stripToolResultDetails } from "./session-transcript-repair.js";

export const BASE_CHUNK_RATIO = 0.4;
export const MIN_CHUNK_RATIO = 0.15;
export const SAFETY_MARGIN = 1.2; // 20% buffer for estimateTokens() inaccuracy
const DEFAULT_SUMMARY_FALLBACK = "No prior history.";
const DEFAULT_PARTS = 2;
const MERGE_SUMMARIES_INSTRUCTIONS =
  "Merge these partial summaries into a single cohesive 3-part checkpoint (Session Story, Handoff, Reference)." +
  " Weave the narratives together chronologically. Preserve artifact IDs, user corrections, and emotional arc.";

// =============================================================================
// 3-Layer Compaction Prompts
// =============================================================================

const COMPACTION_SYSTEM_PROMPT = `You summarize conversations between a user and an AI assistant.
The assistant's identity, tools, and background knowledge are provided separately each turn — do not include those in the summary.

Produce a 3-part checkpoint from the conversation below.
Do not continue the conversation. Only output the checkpoint.`;

const COMPACTION_INITIAL_PROMPT = `Produce a conversation checkpoint in exactly 3 parts:

## Session Story
Tell the story of this conversation as a narrative timeline. Include:
- What the user asked for and why
- What the assistant did (tools called, artifacts created/modified — weave IDs into the prose)
- How the user reacted — corrections, frustrations, approvals, shifts in direction
- What was tried and rejected, and why
- Where the conversation's energy ended up

Write in third person, past tense, like a therapist's progress note.
A reader should understand not just what happened, but why — and how the user feels about the current state.

## Handoff
2-3 sentences. What's pending, what the user expects next, and what tone to strike.
Write as if briefing a colleague picking up this conversation cold.
They should know exactly what to do without asking the user to repeat anything.

## Reference
Compact lookup table. One line per entity. Only include entities that were actually created, modified, or referenced by ID in the conversation.

Format:
- artifact | [type] name | id: UUID | status
- campaign | name | id: UUID
- skill | /skill-key | references read: file1, file2
- agent | @agent-key | delegated for: purpose | result: summary

If no entities were touched, write "(none)".

Example:

## Session Story
The user asked to build 3 Instagram carousels for the Velocity campaign (3f97a35e). Three posts were created — "AI Agents" (06cd14ac), "02:47" (82524f30), and "Zero Users" (8ba35d0b) — using /carousel-designer.

Initial builds used emerald (#34D399) as accent. The user rejected it immediately — red (#B83232) is correct, matching the existing Velocity reference post. All slides were patched.

Hero images were then generated with cream (#E8E4DE) backgrounds to blend seamlessly into the slides. But images weren't visible: the parent div lacked display:flex. The user grew frustrated after multiple fix attempts that addressed symptoms instead of the root layout issue.

## Handoff
Rewrite all 3 hero slides with flex column layout so images render. The user has been patient but expects this fixed on the next attempt. Don't narrate — just fix it and confirm.

## Reference
- artifact | [social-post] AI Agents Carousel | id: 06cd14ac | draft
- artifact | [social-post] 02:47 Carousel | id: 82524f30 | draft
- artifact | [social-post] Zero Users Carousel | id: 8ba35d0b | draft
- campaign | Velocity | id: 3f97a35e
- skill | /carousel-designer | references read: design-system.md, visual-reference.md`;

const COMPACTION_UPDATE_PROMPT = `The messages above are NEW conversation turns to incorporate into the existing checkpoint in <previous-summary> tags.

Rules:
- Continue the Session Story from where it left off. Don't restart the narrative.
- Update the Handoff to reflect the current state.
- Add new entities to Reference. Update status of existing ones. Remove entities no longer relevant.
- Preserve the user's emotional arc and corrections from the prior story.
- If the user's goal shifted, note the shift in the narrative.

Output the full updated checkpoint in the same 3-part format (Session Story, Handoff, Reference).`;

export function estimateMessagesTokens(messages: AgentMessage[]): number {
  // SECURITY: toolResult.details can contain untrusted/verbose payloads; never include in LLM-facing compaction.
  const safe = stripToolResultDetails(messages);
  return safe.reduce((sum, message) => sum + estimateTokens(message), 0);
}

function normalizeParts(parts: number, messageCount: number): number {
  if (!Number.isFinite(parts) || parts <= 1) {
    return 1;
  }
  return Math.min(Math.max(1, Math.floor(parts)), Math.max(1, messageCount));
}

export function splitMessagesByTokenShare(
  messages: AgentMessage[],
  parts = DEFAULT_PARTS,
): AgentMessage[][] {
  if (messages.length === 0) {
    return [];
  }
  const normalizedParts = normalizeParts(parts, messages.length);
  if (normalizedParts <= 1) {
    return [messages];
  }

  const totalTokens = estimateMessagesTokens(messages);
  const targetTokens = totalTokens / normalizedParts;
  const chunks: AgentMessage[][] = [];
  let current: AgentMessage[] = [];
  let currentTokens = 0;

  for (const message of messages) {
    const messageTokens = estimateTokens(message);
    if (
      chunks.length < normalizedParts - 1 &&
      current.length > 0 &&
      currentTokens + messageTokens > targetTokens
    ) {
      chunks.push(current);
      current = [];
      currentTokens = 0;
    }

    current.push(message);
    currentTokens += messageTokens;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

export function chunkMessagesByMaxTokens(
  messages: AgentMessage[],
  maxTokens: number,
): AgentMessage[][] {
  if (messages.length === 0) {
    return [];
  }

  const chunks: AgentMessage[][] = [];
  let currentChunk: AgentMessage[] = [];
  let currentTokens = 0;

  for (const message of messages) {
    const messageTokens = estimateTokens(message);
    if (currentChunk.length > 0 && currentTokens + messageTokens > maxTokens) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(message);
    currentTokens += messageTokens;

    if (messageTokens > maxTokens) {
      // Split oversized messages to avoid unbounded chunk growth.
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Compute adaptive chunk ratio based on average message size.
 * When messages are large, we use smaller chunks to avoid exceeding model limits.
 */
export function computeAdaptiveChunkRatio(messages: AgentMessage[], contextWindow: number): number {
  if (messages.length === 0) {
    return BASE_CHUNK_RATIO;
  }

  const totalTokens = estimateMessagesTokens(messages);
  const avgTokens = totalTokens / messages.length;

  // Apply safety margin to account for estimation inaccuracy
  const safeAvgTokens = avgTokens * SAFETY_MARGIN;
  const avgRatio = safeAvgTokens / contextWindow;

  // If average message is > 10% of context, reduce chunk ratio
  if (avgRatio > 0.1) {
    const reduction = Math.min(avgRatio * 2, BASE_CHUNK_RATIO - MIN_CHUNK_RATIO);
    return Math.max(MIN_CHUNK_RATIO, BASE_CHUNK_RATIO - reduction);
  }

  return BASE_CHUNK_RATIO;
}

/**
 * Check if a single message is too large to summarize.
 * If single message > 50% of context, it can't be summarized safely.
 */
export function isOversizedForSummary(msg: AgentMessage, contextWindow: number): boolean {
  const tokens = estimateTokens(msg) * SAFETY_MARGIN;
  return tokens > contextWindow * 0.5;
}

/**
 * 3-layer compaction: Narrative → Handoff → Reference.
 * Replaces the SDK's generic coding-assistant generateSummary.
 */
async function vibeyGenerateSummary(
  currentMessages: AgentMessage[],
  model: NonNullable<ExtensionContext["model"]>,
  reserveTokens: number,
  apiKey: string,
  signal: AbortSignal | undefined,
  customInstructions: string | undefined,
  previousSummary: string | undefined,
): Promise<string> {
  const maxTokens = Math.floor(0.8 * reserveTokens);

  let basePrompt = previousSummary ? COMPACTION_UPDATE_PROMPT : COMPACTION_INITIAL_PROMPT;
  if (customInstructions) {
    basePrompt = `${basePrompt}\n\nAdditional context: ${customInstructions}`;
  }

  const llmMessages = convertToLlm(currentMessages);
  const conversationText = serializeConversation(llmMessages);

  let promptText = `<conversation>\n${conversationText}\n</conversation>\n\n`;
  if (previousSummary) {
    promptText += `<previous-summary>\n${previousSummary}\n</previous-summary>\n\n`;
  }
  promptText += basePrompt;

  const summarizationMessages = [
    {
      role: "user" as const,
      content: [{ type: "text" as const, text: promptText }],
      timestamp: Date.now(),
    },
  ];

  const response = await completeSimple(
    model,
    {
      systemPrompt: COMPACTION_SYSTEM_PROMPT,
      messages: summarizationMessages as unknown as Parameters<
        typeof completeSimple
      >[1]["messages"],
    },
    { maxTokens, signal, apiKey, reasoning: "high" },
  );

  if (response.stopReason === "error") {
    throw new Error(`Summarization failed: ${response.errorMessage || "Unknown error"}`);
  }

  return (response.content as Array<{ type: string; text?: string }>)
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n");
}

async function summarizeChunks(params: {
  messages: AgentMessage[];
  model: NonNullable<ExtensionContext["model"]>;
  apiKey: string;
  signal: AbortSignal;
  reserveTokens: number;
  maxChunkTokens: number;
  customInstructions?: string;
  previousSummary?: string;
}): Promise<string> {
  if (params.messages.length === 0) {
    return params.previousSummary ?? DEFAULT_SUMMARY_FALLBACK;
  }

  // SECURITY: never feed toolResult.details into summarization prompts.
  const safeMessages = stripToolResultDetails(params.messages);
  const chunks = chunkMessagesByMaxTokens(safeMessages, params.maxChunkTokens);
  let summary = params.previousSummary;

  for (const chunk of chunks) {
    summary = await vibeyGenerateSummary(
      chunk,
      params.model,
      params.reserveTokens,
      params.apiKey,
      params.signal,
      params.customInstructions,
      summary,
    );
  }

  return summary ?? DEFAULT_SUMMARY_FALLBACK;
}

/**
 * Summarize with progressive fallback for handling oversized messages.
 * If full summarization fails, tries partial summarization excluding oversized messages.
 */
export async function summarizeWithFallback(params: {
  messages: AgentMessage[];
  model: NonNullable<ExtensionContext["model"]>;
  apiKey: string;
  signal: AbortSignal;
  reserveTokens: number;
  maxChunkTokens: number;
  contextWindow: number;
  customInstructions?: string;
  previousSummary?: string;
}): Promise<string> {
  const { messages, contextWindow } = params;

  if (messages.length === 0) {
    return params.previousSummary ?? DEFAULT_SUMMARY_FALLBACK;
  }

  // Try full summarization first
  try {
    return await summarizeChunks(params);
  } catch (fullError) {
    console.warn(
      `Full summarization failed, trying partial: ${
        fullError instanceof Error ? fullError.message : String(fullError)
      }`,
    );
  }

  // Fallback 1: Summarize only small messages, note oversized ones
  const smallMessages: AgentMessage[] = [];
  const oversizedNotes: string[] = [];

  for (const msg of messages) {
    if (isOversizedForSummary(msg, contextWindow)) {
      const role = (msg as { role?: string }).role ?? "message";
      const tokens = estimateTokens(msg);
      oversizedNotes.push(
        `[Large ${role} (~${Math.round(tokens / 1000)}K tokens) omitted from summary]`,
      );
    } else {
      smallMessages.push(msg);
    }
  }

  if (smallMessages.length > 0) {
    try {
      const partialSummary = await summarizeChunks({
        ...params,
        messages: smallMessages,
      });
      const notes = oversizedNotes.length > 0 ? `\n\n${oversizedNotes.join("\n")}` : "";
      return partialSummary + notes;
    } catch (partialError) {
      console.warn(
        `Partial summarization also failed: ${
          partialError instanceof Error ? partialError.message : String(partialError)
        }`,
      );
    }
  }

  // Final fallback: Just note what was there
  return (
    `Context contained ${messages.length} messages (${oversizedNotes.length} oversized). ` +
    `Summary unavailable due to size limits.`
  );
}

export async function summarizeInStages(params: {
  messages: AgentMessage[];
  model: NonNullable<ExtensionContext["model"]>;
  apiKey: string;
  signal: AbortSignal;
  reserveTokens: number;
  maxChunkTokens: number;
  contextWindow: number;
  customInstructions?: string;
  previousSummary?: string;
  parts?: number;
  minMessagesForSplit?: number;
}): Promise<string> {
  const { messages } = params;
  if (messages.length === 0) {
    return params.previousSummary ?? DEFAULT_SUMMARY_FALLBACK;
  }

  const minMessagesForSplit = Math.max(2, params.minMessagesForSplit ?? 4);
  const parts = normalizeParts(params.parts ?? DEFAULT_PARTS, messages.length);
  const totalTokens = estimateMessagesTokens(messages);

  if (parts <= 1 || messages.length < minMessagesForSplit || totalTokens <= params.maxChunkTokens) {
    return summarizeWithFallback(params);
  }

  const splits = splitMessagesByTokenShare(messages, parts).filter((chunk) => chunk.length > 0);
  if (splits.length <= 1) {
    return summarizeWithFallback(params);
  }

  const partialSummaries: string[] = [];
  for (const chunk of splits) {
    partialSummaries.push(
      await summarizeWithFallback({
        ...params,
        messages: chunk,
        previousSummary: undefined,
      }),
    );
  }

  if (partialSummaries.length === 1) {
    return partialSummaries[0];
  }

  const summaryMessages: AgentMessage[] = partialSummaries.map((summary) => ({
    role: "user",
    content: summary,
    timestamp: Date.now(),
  }));

  const mergeInstructions = params.customInstructions
    ? `${MERGE_SUMMARIES_INSTRUCTIONS}\n\nAdditional focus:\n${params.customInstructions}`
    : MERGE_SUMMARIES_INSTRUCTIONS;

  return summarizeWithFallback({
    ...params,
    messages: summaryMessages,
    customInstructions: mergeInstructions,
  });
}

export function pruneHistoryForContextShare(params: {
  messages: AgentMessage[];
  maxContextTokens: number;
  maxHistoryShare?: number;
  parts?: number;
}): {
  messages: AgentMessage[];
  droppedMessagesList: AgentMessage[];
  droppedChunks: number;
  droppedMessages: number;
  droppedTokens: number;
  keptTokens: number;
  budgetTokens: number;
} {
  const maxHistoryShare = params.maxHistoryShare ?? 0.5;
  const budgetTokens = Math.max(1, Math.floor(params.maxContextTokens * maxHistoryShare));
  let keptMessages = params.messages;
  const allDroppedMessages: AgentMessage[] = [];
  let droppedChunks = 0;
  let droppedMessages = 0;
  let droppedTokens = 0;

  const parts = normalizeParts(params.parts ?? DEFAULT_PARTS, keptMessages.length);

  while (keptMessages.length > 0 && estimateMessagesTokens(keptMessages) > budgetTokens) {
    const chunks = splitMessagesByTokenShare(keptMessages, parts);
    if (chunks.length <= 1) {
      break;
    }
    const [dropped, ...rest] = chunks;
    const flatRest = rest.flat();

    // After dropping a chunk, repair tool_use/tool_result pairing to handle
    // orphaned tool_results (whose tool_use was in the dropped chunk).
    // repairToolUseResultPairing drops orphaned tool_results, preventing
    // "unexpected tool_use_id" errors from Anthropic's API.
    const repairReport = repairToolUseResultPairing(flatRest);
    const repairedKept = repairReport.messages;

    // Track orphaned tool_results as dropped (they were in kept but their tool_use was dropped)
    const orphanedCount = repairReport.droppedOrphanCount;

    droppedChunks += 1;
    droppedMessages += dropped.length + orphanedCount;
    droppedTokens += estimateMessagesTokens(dropped);
    // Note: We don't have the actual orphaned messages to add to droppedMessagesList
    // since repairToolUseResultPairing doesn't return them. This is acceptable since
    // the dropped messages are used for summarization, and orphaned tool_results
    // without their tool_use context aren't useful for summarization anyway.
    allDroppedMessages.push(...dropped);
    keptMessages = repairedKept;
  }

  return {
    messages: keptMessages,
    droppedMessagesList: allDroppedMessages,
    droppedChunks,
    droppedMessages,
    droppedTokens,
    keptTokens: estimateMessagesTokens(keptMessages),
    budgetTokens,
  };
}

export function resolveContextWindowTokens(model?: ExtensionContext["model"]): number {
  return Math.max(1, Math.floor(model?.contextWindow ?? DEFAULT_CONTEXT_TOKENS));
}
