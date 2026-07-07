'use client'

export function DocEditorProseStyles({
  editorFontSizePx,
  editorFontFamily,
  docFullWidth,
}: {
  editorFontSizePx: string
  editorFontFamily: string
  docFullWidth: boolean
}) {
  return (
    <style jsx global>{`
      .doc-editor-surface .ProseMirror {
        min-height: 200px;
        outline: none;
        font-size: ${editorFontSizePx};
        font-family: ${editorFontFamily};
        line-height: 1.6;
        color: var(--color-foreground);
        caret-color: var(--color-foreground);
        cursor: text;
        ${docFullWidth
          ? 'padding-left: 48px; padding-right: 48px;'
          : 'max-width: 720px; margin-left: auto; margin-right: auto;'}
      }
      .doc-editor-surface .ProseMirror:focus {
        outline: none;
      }
      .doc-editor-surface .ProseMirror p {
        margin: 8px 0;
      }
      .doc-editor-surface .ProseMirror p:first-child {
        margin-top: 0;
      }
      .doc-editor-surface .ProseMirror h1 {
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1.3;
        margin: 16px 0 8px;
      }
      .doc-editor-surface .ProseMirror h2 {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.3;
        margin: 12px 0 8px;
      }
      .doc-editor-surface .ProseMirror h3 {
        font-size: 1.1rem;
        font-weight: 500;
        line-height: 1.3;
        margin: 12px 0 8px;
      }
      .doc-editor-surface .ProseMirror h4 {
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.3;
        margin: 10px 0 6px;
      }
      .doc-editor-surface .ProseMirror [data-type='details'] {
        margin: 10px 0;
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }
      .doc-editor-surface .ProseMirror [data-type='details'] > button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        margin: 4px 4px 0 8px;
        border-radius: 4px;
        flex-shrink: 0;
      }
      .doc-editor-surface .ProseMirror [data-type='details'] [data-type='detailsSummary'] {
        font-weight: 500;
        font-size: 0.875rem;
        padding: 4px 8px;
      }
      .doc-editor-surface .ProseMirror [data-type='details'] [data-type='detailsContent'] {
        padding: 0 8px 8px 2.25rem;
      }
      .doc-editor-surface .ProseMirror ul[data-type='taskList'] {
        list-style: none;
        padding-left: 0;
      }
      .doc-editor-surface .ProseMirror li[data-type='taskItem'] {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 0.4rem;
      }
      .doc-editor-surface .ProseMirror li[data-type='taskItem'] label {
        display: flex;
        align-items: center;
      }
      .doc-editor-surface .ProseMirror li[data-type='taskItem'] > div {
        flex: 1;
      }
      .doc-editor-surface .ProseMirror [data-doc-pull-quote] {
        margin: 12px 0;
        text-align: center;
        font-size: 1.15rem;
        line-height: 1.45;
        font-style: italic;
      }
      .doc-editor-surface .ProseMirror [data-doc-pull-quote] p {
        margin: 0.4em 0;
      }
      .doc-editor-surface .ProseMirror blockquote {
        border-left: 3px solid var(--color-border);
        padding-left: 16px;
        margin: 12px 0;
        color: var(--color-muted-foreground);
        font-style: italic;
      }
      .doc-editor-surface .ProseMirror pre {
        background: var(--color-secondary);
        border-radius: 8px;
        padding: 12px;
        margin: 12px 0;
        overflow-x: auto;
      }
      .doc-editor-surface .ProseMirror code {
        font-family: monospace;
        font-size: 0.85em;
        background: var(--color-secondary);
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }
      .doc-editor-surface .ProseMirror pre code {
        background: none;
        padding: 0;
      }
      .doc-editor-surface .ProseMirror hr {
        border: 0;
        border-top: 1px solid var(--color-border);
        margin: 18px 0;
      }
      .doc-editor-surface .ProseMirror a {
        color: var(--color-primary);
        text-decoration: underline;
      }
      .doc-editor-surface .ProseMirror a:hover {
        text-decoration: none;
      }
      .doc-editor-surface .ProseMirror ul {
        list-style-type: disc;
        padding-left: 24px;
        margin: 8px 0;
      }
      .doc-editor-surface .ProseMirror ol {
        list-style-type: decimal;
        padding-left: 24px;
        margin: 8px 0;
      }
      .doc-editor-surface .ProseMirror li {
        margin: 4px 0;
      }
      .doc-editor-surface .ProseMirror li p {
        margin: 0;
      }
      .doc-editor-surface .ProseMirror img.doc-editor-image {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 16px 0;
        display: block;
      }
      .doc-editor-surface .ProseMirror img.doc-editor-image.ProseMirror-selectednode {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
      .doc-editor-surface .ProseMirror [data-resize-container][data-node='image'] {
        display: block;
        max-width: 100%;
        margin: 16px 0;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        img.doc-editor-image {
        margin: 0;
        display: block;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image'].ProseMirror-selectednode
        [data-resize-wrapper] {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
        border-radius: 8px;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle] {
        position: absolute;
        z-index: 2;
        opacity: 0;
        pointer-events: none;
        touch-action: none;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image'].ProseMirror-selectednode
        [data-resize-handle],
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image'][data-resize-state='true']
        [data-resize-handle] {
        opacity: 1;
        pointer-events: auto;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='top'],
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='bottom'] {
        left: 0;
        right: 0;
        height: 8px;
        cursor: ns-resize;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='left'],
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='right'] {
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: ew-resize;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='top-left'],
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='top-right'],
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='bottom-left'],
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='bottom-right'] {
        width: 10px;
        height: 10px;
        background: var(--color-primary);
        border-radius: 2px;
        box-shadow: 0 0 0 1px var(--background);
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='top-left'] {
        cursor: nwse-resize;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='top-right'] {
        cursor: nesw-resize;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='bottom-left'] {
        cursor: nesw-resize;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']
        [data-resize-handle='bottom-right'] {
        cursor: nwse-resize;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image']:hover
        img.doc-editor-image[data-drag-handle],
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image'].ProseMirror-selectednode
        img.doc-editor-image[data-drag-handle] {
        cursor: grab !important;
      }
      .doc-editor-surface
        .ProseMirror
        [data-resize-container][data-node='image'].ProseMirror-selectednode
        img.doc-editor-image[data-drag-handle]:active,
      .doc-editor-surface .ProseMirror.ProseMirror-dragging {
        cursor: grabbing !important;
      }
      .doc-editor-surface
        .ProseMirror.ProseMirror-dragging
        [data-resize-container][data-node='image'].ProseMirror-selectednode {
        opacity: 0.12;
      }
      /* Native dropcursor is positioned on offsetParent; we render the visible line in DocEditorDropIndicator */
      .doc-editor-dropcursor {
        display: none !important;
      }
      .doc-editor-surface .ProseMirror [data-doc-banner] {
        border-radius: 8px;
        padding: 10px 12px;
        margin: 10px 0;
        box-sizing: border-box;
      }
      .doc-editor-surface .ProseMirror [data-doc-badge] {
        border-radius: 9999px;
        padding: 0.12em 0.55em;
        display: inline;
        vertical-align: baseline;
      }
      .doc-editor-surface .ProseMirror mark {
        border-radius: 2px;
        padding: 0.05em 0;
      }
      .doc-editor-surface .ProseMirror p.is-empty::before {
        content: attr(data-placeholder);
        float: left;
        color: var(--color-muted-foreground);
        pointer-events: none;
        height: 0;
      }
      .doc-editor-surface .ProseMirror table {
        border-collapse: collapse;
        margin: 12px 0;
        table-layout: fixed;
        width: 100%;
        overflow: hidden;
        font-size: 0.95em;
      }
      .doc-editor-surface .ProseMirror table th,
      .doc-editor-surface .ProseMirror table td {
        border: 1px solid var(--color-border);
        padding: 8px 10px;
        vertical-align: top;
        text-align: left;
        position: relative;
        box-sizing: border-box;
        min-width: 1em;
      }
      .doc-editor-surface .ProseMirror table th {
        background: var(--color-secondary);
        font-weight: 600;
      }
      .doc-editor-surface .ProseMirror table .selectedCell {
        background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      }
      .doc-editor-surface .ProseMirror table .column-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: 0;
        width: 4px;
        background: var(--color-primary);
        opacity: 0;
        pointer-events: none;
      }
      .doc-editor-surface .ProseMirror.resize-cursor {
        cursor: col-resize;
      }
    `}</style>
  )
}
