import type { AnyAgentTool } from "./tools/common.js";

type ToolSurfaceMode = "default" | "platform";

function mapToolNameToPlatformCapability(toolName: string): string {
  const normalized = toolName.trim().toLowerCase();
  if (normalized === "vibey_backend") {
    return "campaign_capability";
  }
  if (normalized.includes("gateway") || normalized.includes("openclaw")) {
    return "platform_capability";
  }
  return toolName;
}

export function applyPlatformToolSurface(params: {
  tools: AnyAgentTool[];
  mode?: ToolSurfaceMode;
}): AnyAgentTool[] {
  if (params.mode !== "platform") {
    return params.tools;
  }

  const seenNames = new Set<string>();
  return params.tools.map((tool) => {
    const mappedBase = mapToolNameToPlatformCapability(tool.name);
    let mapped = mappedBase;
    let suffix = 2;
    while (seenNames.has(mapped.toLowerCase())) {
      mapped = `${mappedBase}_${suffix}`;
      suffix += 1;
    }
    seenNames.add(mapped.toLowerCase());
    if (mapped === tool.name) {
      return tool;
    }
    return {
      ...tool,
      name: mapped,
      label: tool.label && tool.label.trim().length > 0 ? tool.label : mapped,
    };
  });
}
