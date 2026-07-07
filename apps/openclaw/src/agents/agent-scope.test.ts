import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { resolveAgentPromptMode, resolveAgentWorkspaceDir } from "./agent-scope.js";

describe("agent scope resolution", () => {
  it("prefers exact agent ids before normalized legacy collisions", () => {
    const cfg: OpenClawConfig = {
      agents: {
        list: [
          {
            id: "org:699e3530-881c-4653-b507-4c4b5993538f:ivy",
            workspace: "/legacy/org:699e3530-881c-4653-b507-4c4b5993538f:ivy",
            promptMode: "platform",
          },
          {
            id: "org-699e3530-881c-4653-b507-4c4b5993538f-ivy",
            workspace: "/canonical/orgs/699e3530-881c-4653-b507-4c4b5993538f/ivy",
            promptMode: "vibey",
          },
        ],
      },
    };

    expect(resolveAgentWorkspaceDir(cfg, "org-699e3530-881c-4653-b507-4c4b5993538f-ivy")).toBe(
      "/canonical/orgs/699e3530-881c-4653-b507-4c4b5993538f/ivy",
    );
    expect(resolveAgentPromptMode(cfg, "org-699e3530-881c-4653-b507-4c4b5993538f-ivy")).toBe(
      "vibey",
    );
  });
});
