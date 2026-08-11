import { updateSessionStoreEntry } from "../../config/sessions.js";
import { formatTokenCount } from "../../utils/usage-format.js";

const MAX_WARNING_REMAINING_TOKENS = 32_000;
const WARNING_REMAINING_RATIO = 0.1;

export type ContextTokenWarning = {
  remainingTokens: number;
  text: string;
};

export function resolveContextTokenWarning(params: {
  totalTokens?: number;
  contextTokens?: number;
}): ContextTokenWarning | null {
  const { totalTokens, contextTokens } = params;
  if (
    typeof totalTokens !== "number" ||
    !Number.isFinite(totalTokens) ||
    totalTokens < 0 ||
    typeof contextTokens !== "number" ||
    !Number.isFinite(contextTokens) ||
    contextTokens <= 0
  ) {
    return null;
  }

  const warningThreshold = Math.min(
    MAX_WARNING_REMAINING_TOKENS,
    Math.ceil(contextTokens * WARNING_REMAINING_RATIO),
  );
  const remainingTokens = Math.max(0, contextTokens - totalTokens);
  if (remainingTokens > warningThreshold) {
    return null;
  }

  return {
    remainingTokens,
    text:
      `⚠️ Heads-up — this conversation is almost at its context limit ` +
      `(~${formatTokenCount(remainingTokens)} tokens left). ` +
      `I’ll compact automatically to keep going.`,
  };
}

export async function claimContextTokenWarning(params: {
  storePath: string;
  sessionKey: string;
  warning: ContextTokenWarning;
}): Promise<string | null> {
  let claimed = false;
  await updateSessionStoreEntry({
    storePath: params.storePath,
    sessionKey: params.sessionKey,
    update: async (entry) => {
      const compactionCount = entry.compactionCount ?? 0;
      if (entry.contextTokenWarningCompactionCount === compactionCount) {
        return null;
      }
      claimed = true;
      return { contextTokenWarningCompactionCount: compactionCount };
    },
  });
  return claimed ? params.warning.text : null;
}
