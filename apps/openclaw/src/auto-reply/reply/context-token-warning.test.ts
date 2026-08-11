import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadSessionStore, saveSessionStore } from "../../config/sessions.js";
import { claimContextTokenWarning, resolveContextTokenWarning } from "./context-token-warning.js";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((entry) => fs.rm(entry, { recursive: true })));
});

describe("resolveContextTokenWarning", () => {
  it("warns when a fresh context snapshot has ten percent remaining", () => {
    expect(resolveContextTokenWarning({ totalTokens: 225_000, contextTokens: 250_000 })).toEqual({
      remainingTokens: 25_000,
      text: "⚠️ Heads-up — this conversation is almost at its context limit (~25k tokens left). I’ll compact automatically to keep going.",
    });
  });

  it("caps the early-warning window at 32k tokens for large contexts", () => {
    expect(
      resolveContextTokenWarning({ totalTokens: 950_000, contextTokens: 1_000_000 }),
    ).toBeNull();
    expect(
      resolveContextTokenWarning({ totalTokens: 968_000, contextTokens: 1_000_000 }),
    ).not.toBeNull();
  });

  it("does not warn before the threshold or from invalid token snapshots", () => {
    expect(resolveContextTokenWarning({ totalTokens: 200_000, contextTokens: 250_000 })).toBeNull();
    expect(
      resolveContextTokenWarning({ totalTokens: undefined, contextTokens: 250_000 }),
    ).toBeNull();
    expect(resolveContextTokenWarning({ totalTokens: 10_000, contextTokens: 0 })).toBeNull();
  });
});

describe("claimContextTokenWarning", () => {
  it("deduplicates within one compaction cycle and rearms after compaction", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-context-warning-"));
    cleanupPaths.push(root);
    const storePath = path.join(root, "sessions.json");
    const sessionKey = "agent:pixel:slack:direct:U1";
    await saveSessionStore(storePath, {
      [sessionKey]: { sessionId: "session", updatedAt: Date.now(), compactionCount: 0 },
    });

    const warning = { remainingTokens: 25_000, text: "warning" };
    await expect(claimContextTokenWarning({ storePath, sessionKey, warning })).resolves.toBe(
      "warning",
    );
    await expect(claimContextTokenWarning({ storePath, sessionKey, warning })).resolves.toBeNull();

    const stored = loadSessionStore(storePath, { skipCache: true });
    stored[sessionKey].compactionCount = 1;
    await saveSessionStore(storePath, stored);

    await expect(claimContextTokenWarning({ storePath, sessionKey, warning })).resolves.toBe(
      "warning",
    );
  });
});
