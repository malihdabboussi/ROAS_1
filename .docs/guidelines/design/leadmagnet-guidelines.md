# Lead Magnet Editor - Design Guidelines

**Content Components, Typography System, BlockNote Integration**

---

## Keyword Index (AI Search)

**Typography:** `content-h1`, `content-h2`, `content-h3`, `content-h4`, `content-body`, `content-typography`, `user-typography`, `heading-styles`
**Components:** `VibeyComponent`, `VibeyComponentBlock`, `ComponentRenderer`, `content-components`, `blocknote-overrides`
**Toolbars:** `CustomFormattingToolbar`, `VibeyTextSelectionToolbar`, `formatting-toolbar`, `text-selection`
**Storage:** `innerHTML`, `textContent`, `rich-text`, `html-storage`
**Editor:** `BlockNote`, `blocknote-editor`, `lead-magnet-editor`, `slide-editor`

---

## Quick Reference

**TYPOGRAPHY**

1. [Content Typography System](#1-content-typography-system)
2. [Typography CSS Classes](#2-typography-css-classes)
3. [Usage in VibeyComponents](#3-usage-in-vibeycomponents)

**TOOLBARS** 4. [Toolbar Architecture](#4-toolbar-architecture) 5. [VibeyTextSelectionToolbar](#5-vibeytextselectiontoolbar) 6. [CustomFormattingToolbar](#6-customformattingtoolbar)

**DATA STORAGE** 7. [innerHTML vs textContent](#7-innerhtml-vs-textcontent) 8. [Component Fix Status](#8-component-fix-status)

---

## 1. Content Typography System

**Keywords:** `content-typography`, `user-typography`, `heading-styles`, `content-h1`

**Rule:** User-generated content inside VibeyComponents uses `content-*` prefixed classes to distinguish from system UI typography.

**Why This Exists:**

- **System UI:** Uses `body-1`, `body-2`, `title-h6` etc. for app interface
- **User Content:** Uses `content-h1`, `content-h2`, `content-body` etc. for slide/document content
- **Single Source of Truth:** Both BlockNote and VibeyComponents reference the same CSS classes

**Typography Mapping:**

| Content Type | CSS Class      | Size            | Weight | Line Height | Use Case                     |
| ------------ | -------------- | --------------- | ------ | ----------- | ---------------------------- |
| Heading 1    | `content-h1`   | 2rem (32px)     | 700    | 1.2         | Slide titles, major sections |
| Heading 2    | `content-h2`   | 1.5rem (24px)   | 600    | 1.3         | Section headings             |
| Heading 3    | `content-h3`   | 1.25rem (20px)  | 600    | 1.4         | Subsection headings          |
| Heading 4    | `content-h4`   | 1.125rem (18px) | 600    | 1.4         | Minor headings               |
| Body         | `content-body` | 1rem (16px)     | 400    | 1.6         | Paragraph text               |

**Pattern:**

```tsx
// Inside table cell, callout, or any VibeyComponent:
<span className="content-h1">This is a slide title</span>
<span className="content-body">This is regular text</span>

// User can mix types in same cell:
<span className="content-h2">Benefits</span>
<span className="content-body">Here's why this matters...</span>
```

---

## 2. Typography CSS Classes

**Keywords:** `content-h1`, `content-h2`, `content-h3`, `content-h4`, `content-body`

**Location:** `apps/app/src/app/globals.css` (to be added)

**CSS Definition:**

```css
/* Content Typography - User-generated content in VibeyComponents */
/* Matches BlockNote heading sizes defined in blocknote-overrides.css */

.content-h1 {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
}

.content-h2 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}

.content-h3 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
}

.content-h4 {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
}

.content-body {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
}
```

**Alignment with BlockNote:**
These values MUST match `blocknote-overrides.css` (lines 464-489):

```css
/* BlockNote heading styles */
.bn-editor h1,
.bn-editor [data-heading-level='1'] {
  font-size: 2rem !important; /* = content-h1 */
  font-weight: 700 !important;
  line-height: 1.2 !important;
}
```

---

## 3. Usage in VibeyComponents

**Keywords:** `VibeyComponent`, `ComponentRenderer`, `execCommand`

**Rule:** When user applies heading format via VibeyTextSelectionToolbar, wrap selected text in semantic HTML tag with content class.

**Implementation Pattern:**

```tsx
// In VibeyTextSelectionToolbar
const applyBlockType = (type: 'h1' | 'h2' | 'h3' | 'h4' | 'p') => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return

  const range = selection.getRangeAt(0)
  const wrapper = document.createElement(type === 'p' ? 'span' : type)

  // Add content class
  const className = type === 'p' ? 'content-body' : `content-${type}`
  wrapper.className = className

  range.surroundContents(wrapper)
}
```

**Storage:**

- Components MUST use `innerHTML` to preserve HTML tags
- On save: `e.currentTarget.innerHTML` (NOT `textContent`)
- On render: `dangerouslySetInnerHTML={{ __html: text }}`

---

## 4. Toolbar Architecture

**Keywords:** `CustomFormattingToolbar`, `VibeyTextSelectionToolbar`, `toolbar-architecture`

**Two Toolbar Systems:**

| Toolbar                     | Engine                | Used For                                             | Location                                  |
| --------------------------- | --------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `CustomFormattingToolbar`   | BlockNote/ProseMirror | Standard blocks (paragraphs, headings, lists)        | `blocknote/CustomFormattingToolbar.tsx`   |
| `VibeyTextSelectionToolbar` | Browser `execCommand` | VibeyComponent blocks (tables, callouts, icon lists) | `blocknote/VibeyTextSelectionToolbar.tsx` |

**Why Two Toolbars?**

- VibeyComponentBlock has `content: "none"` - BlockNote doesn't manage its content
- VibeyComponents render their own `<span contentEditable>` elements
- Standard BlockNote toolbar can't access/format this content
- Custom toolbar uses native browser APIs to format selection

---

## 5. VibeyTextSelectionToolbar

**Keywords:** `VibeyTextSelectionToolbar`, `text-selection`, `execCommand`

**File:** `apps/app/src/features/lead-magnets/components/editor/blocknote/VibeyTextSelectionToolbar.tsx`

**Current Features:**

- Bold (execCommand: 'bold')
- Italic (execCommand: 'italic')
- Underline (execCommand: 'underline')
- Strikethrough (execCommand: 'strikeThrough')
- Text Color (custom color picker)
- Link (execCommand: 'createLink')

**Missing Features (to match CustomFormattingToolbar):**

- Block Type Selector (H1, H2, H3, H4, Paragraph)
- Text Alignment (left, center, right)
- Nest/Unnest (for hierarchical content)

**Design Requirements:**

- Must be visually 1:1 identical to CustomFormattingToolbar
- Same button order and grouping
- Same icon sizes and spacing
- Same color picker UI (CustomColorStyleButton)

---

## 6. CustomFormattingToolbar

**Keywords:** `CustomFormattingToolbar`, `blocknote-toolbar`

**File:** `apps/app/src/features/lead-magnets/components/editor/blocknote/CustomFormattingToolbar.tsx`

**Features:**

```tsx
<FormattingToolbar>
  <BlockTypeSelect /> // H1, H2, H3, Paragraph selector
  <CustomColorStyleButton /> // Text/Background color
  <BasicTextStyleButton style="bold" />
  <BasicTextStyleButton style="italic" />
  <BasicTextStyleButton style="underline" />
  <BasicTextStyleButton style="strike" />
  <TextAlignButton alignment="left" />
  <TextAlignButton alignment="center" />
  <TextAlignButton alignment="right" />
  <NestBlockButton />
  <UnnestBlockButton />
  <CreateLinkButton />
</FormattingToolbar>
```

**Reference Implementation:** This is the gold standard for VibeyTextSelectionToolbar design.

---

## 7. innerHTML vs textContent

**Keywords:** `innerHTML`, `textContent`, `rich-text`, `html-storage`

**Critical Rule:** VibeyComponents MUST use `innerHTML` to preserve rich text formatting.

**The Problem:**

```tsx
// WRONG - Strips all HTML tags
onBlur={(e) => handleChange(e.currentTarget.textContent || '')}
// Input: "<strong>Hello</strong> <em>world</em>"
// Output: "Hello world" (formatting lost!)

// CORRECT - Preserves HTML
onBlur={(e) => handleChange(e.currentTarget.innerHTML || '')}
// Input: "<strong>Hello</strong> <em>world</em>"
// Output: "<strong>Hello</strong> <em>world</em>" (formatting preserved)
```

**Rendering Pattern:**

```tsx
// For view mode AND edit mode, render with dangerouslySetInnerHTML
<span dangerouslySetInnerHTML={{ __html: item.text }} />

// For edit mode, also allow contentEditable
<span
  contentEditable
  suppressContentEditableWarning
  onBlur={(e) => handleTextChange(index, e.currentTarget.innerHTML || '')}
  dangerouslySetInnerHTML={{ __html: item.text }}
/>
```

---

## 8. Component Fix Status

**Keywords:** `component-fix-status`, `innerHTML-fix`, `content-components`

### Components Needing innerHTML Fix

| Component       | File                         | Current Storage | Lines to Fix           |
| --------------- | ---------------------------- | --------------- | ---------------------- |
| SimpleTable     | `tables/SimpleTable.tsx`     | `textContent`   | ~346                   |
| ComparisonTable | `tables/ComparisonTable.tsx` | `textContent`   | ~722                   |
| TodoList        | `lists/TodoList.tsx`         | `textContent`   | ~106                   |
| BulletList      | `lists/BulletList.tsx`       | `textContent`   | ~82                    |
| NumberedList    | `lists/NumberedList.tsx`     | `textContent`   | ~92                    |
| ContentBox      | `layout/ContentBox.tsx`      | `textContent`   | ~46, ~61               |
| ProcessSteps    | `layout/ProcessSteps.tsx`    | `textContent`   | ~112, ~129, ~178, ~195 |
| LabeledBoxes    | `layout/LabeledBoxes.tsx`    | `textContent`   | ~182, ~202             |
| IconGrid        | `media/IconGrid.tsx`         | `textContent`   | ~162                   |
| Heading1-4      | `text/Heading1-4.tsx`        | `textContent`   | ~48 each               |
| Title           | `text/Title.tsx`             | `textContent`   | ~48                    |
| Subtitle        | `text/Subtitle.tsx`          | `textContent`   | ~48                    |
| Paragraph       | `text/Paragraph.tsx`         | `textContent`   | ~48                    |

**Total: 13 components need updating**

### Components Already Correct

| Component       | File                           | Storage     |
| --------------- | ------------------------------ | ----------- |
| IconList        | `lists/IconList.tsx`           | `innerHTML` |
| CalloutInfo     | `callouts/CalloutInfo.tsx`     | `innerHTML` |
| CalloutWarning  | `callouts/CalloutWarning.tsx`  | `innerHTML` |
| CalloutSuccess  | `callouts/CalloutSuccess.tsx`  | `innerHTML` |
| CalloutTip      | `callouts/CalloutTip.tsx`      | `innerHTML` |
| CalloutQuestion | `callouts/CalloutQuestion.tsx` | `innerHTML` |

**Total: 6 components already correct**

### Components Not Applicable

| Component        | Reason                          |
| ---------------- | ------------------------------- |
| Divider          | Layout only, no editable text   |
| Spacer           | Layout only, no editable text   |
| ContentImage     | Media component                 |
| ContentIcon      | Media component                 |
| Charts (all)     | Data-driven, no contentEditable |
| TableMenus       | UI menus, not content           |
| InlineIconPicker | Utility component               |

---

## Implementation Priority

**Phase 1: Infrastructure**

1. Add `content-h1` through `content-body` CSS classes to globals.css
2. Ensure CSS values match blocknote-overrides.css exactly

**Phase 2: Toolbar Parity**

1. Add Block Type Selector to VibeyTextSelectionToolbar
2. Add Text Alignment buttons
3. Match visual design 1:1 with CustomFormattingToolbar

**Phase 3: Component Updates**

1. Update all 13 components to use `innerHTML` instead of `textContent`
2. Update rendering to use `dangerouslySetInnerHTML`
3. Test formatting preservation in each component

---

## Quick Checklist

**Before PR:**

- [ ] Content typography classes defined in globals.css
- [ ] CSS values match blocknote-overrides.css
- [ ] VibeyTextSelectionToolbar has all formatting options
- [ ] Toolbar design matches CustomFormattingToolbar exactly
- [ ] All components use `innerHTML` for saving
- [ ] All components use `dangerouslySetInnerHTML` for rendering
- [ ] Formatting persists across save/reload
- [ ] Tested in light and dark themes

---

**For related patterns, see:**

- Design system: `.docs/guidelines/design/design-guidelines.md`
- Code architecture: `.docs/guidelines/architecture/project-architecture.md`
- BlockNote overrides: `apps/app/src/features/lead-magnets/styles/blocknote-overrides.css`
