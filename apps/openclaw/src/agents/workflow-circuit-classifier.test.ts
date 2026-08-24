import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildWorkflowPayloadFingerprint,
  resolveWorkflowClass,
} from "./workflow-circuit-classifier.js";

function readVibeyActionNames(): string[] {
  const source = fs.readFileSync(
    new URL(
      "../../../agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts",
      import.meta.url,
    ),
    "utf8",
  );
  return Array.from(source.matchAll(/^  ([a-zA-Z0-9_]+): \{/gm), (match) => match[1]).filter(
    (action): action is string => Boolean(action),
  );
}

describe("workflow circuit classifier", () => {
  it("maps core tools and artifact actions to stable workflow classes", () => {
    expect(resolveWorkflowClass({ toolName: "read", params: { path: "a.ts" } })).toBe(
      "file_ingestion",
    );
    expect(resolveWorkflowClass({ toolName: "bash", params: { cmd: "pnpm test" } })).toBe(
      "command_execution",
    );
    expect(
      resolveWorkflowClass({
        toolName: "campaign_capability",
        params: { action: "generate_visual_html", data: { presentation_id: "deck-1" } },
      }),
    ).toBe("presentation_render");
    expect(
      resolveWorkflowClass({
        toolName: "vibey_backend",
        params: { action: "supabase_run_sql", data: { sql: "select 1" } },
      }),
    ).toBe("database_execution");
  });

  it("keeps campaign brain reads off the shared memory_save / agent-brain circuit", () => {
    expect(
      resolveWorkflowClass({
        toolName: "campaign_capability",
        params: { action: "search_campaign_brain", data: { query: "offer", campaign_id: "c1" } },
      }),
    ).toBe("brain_campaign_read");
    expect(
      resolveWorkflowClass({
        toolName: "campaign_capability",
        params: { action: "search_agent_brain", data: { query: "offer", brain_id: "b1" } },
      }),
    ).toBe("brain_agent_read");
    expect(
      resolveWorkflowClass({
        toolName: "campaign_capability",
        params: { action: "search_company_brain", data: { query: "offer" } },
      }),
    ).toBe("brain_company_read");
    expect(
      resolveWorkflowClass({
        toolName: "campaign_capability",
        params: { action: "search_user_brain", data: { query: "offer" } },
      }),
    ).toBe("memory_read");
    expect(
      resolveWorkflowClass({
        toolName: "campaign_capability",
        params: { action: "synthesize_user_brain_topic", data: { topic: "webinars" } },
      }),
    ).toBe("memory_read");
    expect(
      resolveWorkflowClass({
        toolName: "campaign_capability",
        params: { action: "ingest_user_brain_text", data: { text: "note", title: "t" } },
      }),
    ).toBe("memory_save");
    expect(resolveWorkflowClass({ toolName: "memory_search", params: { query: "x" } })).toBe(
      "memory_read",
    );
  });

  it("suggests search_campaign_brain when agent/user brain circuits open", async () => {
    const { resolveVerifiedRecoveryOptions } = await import("./workflow-circuit-classifier.js");
    const agentOpts = resolveVerifiedRecoveryOptions("brain_agent_read");
    expect(agentOpts.some((o) => o.label.includes("search_campaign_brain"))).toBe(true);
    const campaignOpts = resolveVerifiedRecoveryOptions("brain_campaign_read");
    expect(campaignOpts.some((o) => o.label.toLowerCase().includes("campaign"))).toBe(true);
  });

  it("classifies every current Vibey action doc into a known workflow class", () => {
    const actionNames = readVibeyActionNames();
    expect(actionNames.length).toBeGreaterThan(300);

    const unknown = actionNames.filter(
      (action) =>
        resolveWorkflowClass({
          toolName: "campaign_capability",
          params: { action, data: { sample: true } },
        }) === "unknown_workflow",
    );

    expect(unknown).toEqual([]);
  });

  it("uses redacted but payload-sensitive fingerprints", () => {
    const base = {
      toolName: "campaign_capability",
      params: {
        action: "write_funnel_file",
        data: {
          path: "index.html",
          content: "<!doctype html><html><body>Version A</body></html>".repeat(20),
          token: "secret-token",
        },
      },
    };
    const same = buildWorkflowPayloadFingerprint(base);
    const changed = buildWorkflowPayloadFingerprint({
      ...base,
      params: {
        ...base.params,
        data: {
          ...base.params.data,
          content: "<!doctype html><html><body>Version B</body></html>".repeat(20),
        },
      },
    });

    expect(buildWorkflowPayloadFingerprint(base)).toBe(same);
    expect(changed).not.toBe(same);
  });
});
