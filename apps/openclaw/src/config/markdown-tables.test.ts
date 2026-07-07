import { describe, expect, it } from "vitest";
import { resolveMarkdownTableMode } from "./markdown-tables.js";

describe("resolveMarkdownTableMode", () => {
  it("defaults Slack markdown tables to bullets", () => {
    expect(resolveMarkdownTableMode({ channel: "slack" })).toBe("bullets");
  });

  it("allows Slack markdown table mode overrides", () => {
    expect(
      resolveMarkdownTableMode({
        channel: "slack",
        cfg: { channels: { slack: { markdown: { tables: "code" } } } },
      }),
    ).toBe("code");
  });
});
