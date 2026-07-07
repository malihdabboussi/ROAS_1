export function buildSpaceDocExportHtml(title: string, docBody: string): string {
  const heading = title.trim() || 'Untitled'
  const escapedTitle = heading
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapedTitle}</title>
</head>
<body>
<h1>${escapedTitle}</h1>
${docBody}
</body>
</html>`
}
