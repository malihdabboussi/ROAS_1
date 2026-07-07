import { describe, expect, it } from "vitest";
import type { AnyAgentTool } from "./tools/common.js";
import { applyPlatformToolSurface } from "./platform-tool-surface.js";

function makeTool(name: string): AnyAgentTool {
  return {
    name,
    description: `${name} tool`,
    parameters: { type: "object", properties: {} },
    execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
  };
}

describe("applyPlatformToolSurface", () => {
  it("keeps names unchanged in default mode", () => {
    const tools = [makeTool("vibey_backend"), makeTool("read")];
    const surfaced = applyPlatformToolSurface({ tools, mode: "default" });
    expect(surfaced.map((tool) => tool.name)).toEqual(["vibey_backend", "read"]);
  });

  it("maps internal platform names in platform mode", () => {
    const tools = [makeTool("vibey_backend"), makeTool("gateway_admin"), makeTool("read")];
    const surfaced = applyPlatformToolSurface({ tools, mode: "platform" });
    expect(surfaced.map((tool) => tool.name)).toEqual([
      "campaign_capability",
      "platform_capability",
      "read",
    ]);
  });

  it("keeps mapped names unique", () => {
    const tools = [makeTool("vibey_backend"), makeTool("vibey_backend")];
    const surfaced = applyPlatformToolSurface({ tools, mode: "platform" });
    expect(surfaced.map((tool) => tool.name)).toEqual([
      "campaign_capability",
      "campaign_capability_2",
    ]);
  });
});
