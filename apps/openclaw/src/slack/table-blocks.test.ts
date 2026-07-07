import { describe, expect, it } from "vitest";
import { buildSlackMessagePayloads } from "./table-blocks.js";

describe("buildSlackMessagePayloads", () => {
  it("renders markdown tables as native Slack table blocks", () => {
    const payloads = buildSlackMessagePayloads(
      `
Intro text

| Name | Value |
| ---- | ----- |
| A    | 1     |
| B    | 2     |
`.trim(),
      { chunkLimit: 4000, tableMode: "code" },
    );

    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.blocks?.[0]).toEqual({
      type: "section",
      text: { type: "mrkdwn", text: "Intro text" },
    });
    expect(payloads[0]?.blocks?.[1]).toEqual({
      type: "table",
      rows: [
        [
          { type: "raw_text", text: "Name" },
          { type: "raw_text", text: "Value" },
        ],
        [
          { type: "raw_text", text: "A" },
          { type: "raw_text", text: "1" },
        ],
        [
          { type: "raw_text", text: "B" },
          { type: "raw_text", text: "2" },
        ],
      ],
    });
    expect(payloads[0]?.text).toContain("Intro text");
    expect(payloads[0]?.text).not.toContain("| ---- | ----- |");
  });

  it("preserves surrounding text order around a table", () => {
    const payloads = buildSlackMessagePayloads(
      `
Before

| Item | Count |
| ---- | ----- |
| One  | 1     |

After
`.trim(),
      { chunkLimit: 4000, tableMode: "code" },
    );

    expect(payloads[0]?.blocks?.map((block) => block.type)).toEqual(["section", "table", "section"]);
    expect(payloads[0]?.blocks?.[0]).toMatchObject({
      text: { text: "Before" },
    });
    expect(payloads[0]?.blocks?.[2]).toMatchObject({
      text: { text: "After" },
    });
  });

  it("keeps non-table markdown as existing text-only Slack mrkdwn", () => {
    const payloads = buildSlackMessagePayloads("**Important:** see [docs](https://example.com)", {
      chunkLimit: 4000,
      tableMode: "code",
    });

    expect(payloads).toEqual([
      {
        text: "*Important:* see <https://example.com|docs>",
      },
    ]);
  });

  it("falls back to text when a table exceeds Slack column limits", () => {
    const header = Array.from({ length: 21 }, (_, index) => `H${index + 1}`);
    const row = Array.from({ length: 21 }, (_, index) => `V${index + 1}`);
    const separator = Array.from({ length: 21 }, () => "---");
    const markdown = [
      `| ${header.join(" | ")} |`,
      `| ${separator.join(" | ")} |`,
      `| ${row.join(" | ")} |`,
    ].join("\n");

    const payloads = buildSlackMessagePayloads(markdown, {
      chunkLimit: 4000,
      tableMode: "code",
    });

    expect(payloads.some((payload) => payload.blocks?.some((block) => block.type === "table"))).toBe(
      false,
    );
    expect(payloads[0]?.text).toContain("| H1");
  });

  it("falls back to text when a table exceeds Slack row limits", () => {
    const rows = Array.from({ length: 100 }, (_, index) => `| Row ${index + 1} | ${index + 1} |`);
    const markdown = ["| Name | Value |", "| ---- | ----- |", ...rows].join("\n");

    const payloads = buildSlackMessagePayloads(markdown, {
      chunkLimit: 4000,
      tableMode: "code",
    });

    expect(payloads.some((payload) => payload.blocks?.some((block) => block.type === "table"))).toBe(
      false,
    );
    expect(payloads[0]?.text).toContain("| Name");
    expect(payloads[0]?.text).toContain("| Row 100");
  });
});
