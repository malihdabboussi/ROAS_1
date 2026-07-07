export function formatDiscordComponentEventText(params: {
  kind: "button" | "select";
  label: string;
  values?: string[];
}): string {
  if (params.kind === "button") {
    return `Clicked "${params.label}".`;
  }
  const values = params.values ?? [];
  if (values.length === 0) {
    return `Updated "${params.label}".`;
  }
  return `Selected ${values.join(", ")} from "${params.label}".`;
}
