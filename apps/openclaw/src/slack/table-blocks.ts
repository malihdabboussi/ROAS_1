import MarkdownIt from "markdown-it";
import type { MarkdownTableMode } from "../config/types.base.js";
import { markdownToSlackMrkdwnChunks } from "./format.js";

const SLACK_TABLE_MAX_ROWS = 100;
const SLACK_TABLE_MAX_CELLS_PER_ROW = 20;
const SLACK_SECTION_TEXT_LIMIT = 3000;

export type SlackRawTextCell = {
  type: "raw_text";
  text: string;
};

export type SlackTableBlock = {
  type: "table";
  rows: SlackRawTextCell[][];
};

export type SlackSectionBlock = {
  type: "section";
  text: {
    type: "mrkdwn";
    text: string;
  };
};

export type SlackBlock = SlackSectionBlock | SlackTableBlock;

export type SlackMessagePayload = {
  text: string;
  blocks?: SlackBlock[];
};

type BuildSlackMessagePayloadOptions = {
  chunkLimit: number;
  tableMode?: MarkdownTableMode;
};

type MarkdownToken = {
  type: string;
  content?: string;
  children?: MarkdownToken[];
  map?: [number, number] | null;
};

type SlackTableSegment =
  | {
      kind: "text";
      markdown: string;
    }
  | {
      kind: "table";
      markdown: string;
      block: SlackTableBlock;
      eligible: boolean;
    };

const tableParser = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: false,
  typographer: false,
});
tableParser.enable("table");
tableParser.enable("strikethrough");
tableParser.disable("autolink");

function buildTextPayloads(
  markdown: string,
  chunkLimit: number,
  tableMode: MarkdownTableMode | undefined,
): SlackMessagePayload[] {
  const chunks = markdownToSlackMrkdwnChunks(markdown, chunkLimit, { tableMode });
  if (!chunks.length && markdown.trim()) {
    return [{ text: markdown.trim() }];
  }
  return chunks.map((text) => ({ text }));
}

function buildSectionBlocks(
  markdown: string,
  chunkLimit: number,
  tableMode: MarkdownTableMode | undefined,
): SlackSectionBlock[] {
  return markdownToSlackMrkdwnChunks(markdown, Math.min(chunkLimit, SLACK_SECTION_TEXT_LIMIT), {
    tableMode,
  })
    .filter((text) => text.trim().length > 0)
    .map((text) => ({
      type: "section",
      text: { type: "mrkdwn", text },
    }));
}

function buildBlockFallbackText(markdown: string, chunkLimit: number): string {
  const [firstChunk] = markdownToSlackMrkdwnChunks(markdown, chunkLimit, {
    tableMode: "bullets",
  });
  return firstChunk?.trim() || markdown.trim().slice(0, chunkLimit) || " ";
}

function extractPlainText(token: MarkdownToken): string {
  if (token.type === "softbreak" || token.type === "hardbreak") {
    return "\n";
  }
  if (token.children?.length) {
    return token.children.map(extractPlainText).join("");
  }
  return token.content ?? "";
}

function normalizeCellText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function collectTableRows(
  tokens: MarkdownToken[],
  tableOpenIndex: number,
): { rows: string[][]; tableCloseIndex: number } {
  const rows: string[][] = [];
  let currentRow: string[] | null = null;
  let currentCell: string[] | null = null;
  let tableCloseIndex = tableOpenIndex;

  for (let index = tableOpenIndex + 1; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    if (token.type === "table_close") {
      tableCloseIndex = index;
      break;
    }
    if (token.type === "tr_open") {
      currentRow = [];
      continue;
    }
    if (token.type === "tr_close") {
      if (currentRow) {
        rows.push(currentRow);
      }
      currentRow = null;
      continue;
    }
    if (token.type === "th_open" || token.type === "td_open") {
      currentCell = [];
      continue;
    }
    if (token.type === "th_close" || token.type === "td_close") {
      if (currentRow && currentCell) {
        currentRow.push(normalizeCellText(currentCell.join("")));
      }
      currentCell = null;
      continue;
    }
    if (currentCell && token.type === "inline") {
      currentCell.push(extractPlainText(token));
    }
  }

  return { rows, tableCloseIndex };
}

function buildTableBlock(rows: string[][]): SlackTableBlock {
  return {
    type: "table",
    rows: rows.map((row) => row.map((text) => ({ type: "raw_text", text }))),
  };
}

function isEligibleSlackTable(block: SlackTableBlock): boolean {
  return (
    block.rows.length > 0 &&
    block.rows.length <= SLACK_TABLE_MAX_ROWS &&
    block.rows.every(
      (row) => row.length > 0 && row.length <= SLACK_TABLE_MAX_CELLS_PER_ROW,
    )
  );
}

function markdownFromLines(lines: string[], start: number, end: number): string {
  return lines.slice(start, end).join("\n").trim();
}

function parseSlackTableSegments(markdown: string): SlackTableSegment[] {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const tokens = tableParser.parse(normalized, {}) as MarkdownToken[];
  const segments: SlackTableSegment[] = [];
  let cursorLine = 0;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token?.type !== "table_open" || !token.map) {
      continue;
    }

    const [startLine, endLine] = token.map;
    const leadingText = markdownFromLines(lines, cursorLine, startLine);
    if (leadingText) {
      segments.push({ kind: "text", markdown: leadingText });
    }

    const { rows, tableCloseIndex } = collectTableRows(tokens, index);
    const block = buildTableBlock(rows);
    const tableMarkdown = markdownFromLines(lines, startLine, endLine);
    if (tableMarkdown) {
      segments.push({
        kind: "table",
        markdown: tableMarkdown,
        block,
        eligible: isEligibleSlackTable(block),
      });
    }

    cursorLine = endLine;
    index = tableCloseIndex;
  }

  const trailingText = markdownFromLines(lines, cursorLine, lines.length);
  if (trailingText) {
    segments.push({ kind: "text", markdown: trailingText });
  }

  return segments.length ? segments : [{ kind: "text", markdown: normalized.trim() }];
}

export function buildSlackMessagePayloads(
  markdown: string,
  options: BuildSlackMessagePayloadOptions,
): SlackMessagePayload[] {
  const source = markdown?.trim() ?? "";
  if (!source) {
    return [];
  }

  const chunkLimit = Math.max(1, options.chunkLimit);
  const fallbackTableMode = options.tableMode;
  const segments = parseSlackTableSegments(source);
  const hasNativeTable = segments.some((segment) => segment.kind === "table" && segment.eligible);
  if (!hasNativeTable) {
    return buildTextPayloads(source, chunkLimit, fallbackTableMode);
  }

  const blocks: SlackBlock[] = [];
  const fallbackMarkdown: string[] = [];
  for (const segment of segments) {
    if (segment.kind === "text") {
      blocks.push(...buildSectionBlocks(segment.markdown, chunkLimit, "off"));
      fallbackMarkdown.push(segment.markdown);
      continue;
    }
    if (segment.eligible) {
      blocks.push(segment.block);
      fallbackMarkdown.push(segment.markdown);
      continue;
    }
    blocks.push(...buildSectionBlocks(segment.markdown, chunkLimit, fallbackTableMode));
    fallbackMarkdown.push(segment.markdown);
  }

  if (!blocks.length) {
    return buildTextPayloads(source, chunkLimit, fallbackTableMode);
  }

  return [
    {
      text: buildBlockFallbackText(fallbackMarkdown.join("\n\n"), chunkLimit),
      blocks,
    },
  ];
}
