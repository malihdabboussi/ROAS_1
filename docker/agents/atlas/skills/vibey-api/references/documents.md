# Documents

## create_docx
**Required keys:** `title`, `content`

**Optional keys:** `campaign_id`, `space_id`, `conversation_id`, `document_type`, `deliverable_id`, `content_format`, `file_name`, `status`, `priority`, `assignee_type`, `assignee_id`, `start_date`, `due_date`, `description`, `notes`, `parent_item_id`, `sort_order`, `recurrence`, `category`, `custom_data`

**Types:** `campaign_id`: string, `space_id`: string, `conversation_id`: string, `title`: string, `content`: string, `document_type`: string, `deliverable_id`: string, `content_format`: string, `file_name`: string, `status`: string, `priority`: string, `category`: string, `assignee_type`: string, `assignee_id`: string, `start_date`: iso_date, `due_date`: iso_date, `description`: string, `notes`: string, `parent_item_id`: string, `sort_order`: number, `recurrence`: object, `custom_data`: object

**Use when:** Create a downloadable Word DOCX file from markdown, HTML, or plain text.

Creates a downloadable Word DOCX file from content. User sees: DOCX download link in chat + document in Studio > Documents. Set content_format to "markdown" (default), "html", or "text" to match your content. Use Markdown tables for structured rows/columns when content_format is "markdown". If content contains HTML tags (<h1>, <p>, <table>, etc.), you MUST set content_format: "html".

```json
{"action":"create_docx","label":"Rendering your Word document","data":{"title":"Report","content":"# Report\n\n| Field | Value |\n| ----- | ----- |\n| A | 1 |","content_format":"markdown"}}
```

```json
{"action":"create_docx","label":"Rendering your Word document","data":{"title":"Report","content":"<h1>Report</h1><p>Body text</p>","content_format":"html"}}
```

Contract example: create a Word document report
```json
{"action":"create_docx","label":"create a Word document report","data":{"title":"Brief","content":"# Brief\n\n| Field | Value |\n| ----- | ----- |\n| A | 1 |","content_format":"markdown"}}
```

## create_pdf
**Optional keys:** `title`, `content`, `html`, `markdown`, `filename`

**Types:** `title`: string, `content`: string, `html`: string, `markdown`: string, `filename`: string

Creates downloadable PDF from content. User sees: PDF download link in chat + document in Studio > Documents. Set content_format to "markdown" (default), "html", or "text" to match your content. If content contains HTML tags (<h1>, <p>, <table>, etc.), you MUST set content_format: "html" — otherwise tags print as raw text.

```json
{"action":"create_pdf","label":"Rendering your PDF","data":{"title":"Report","content":"# Report","content_format":"markdown"}}
```

```json
{"action":"create_pdf","label":"Rendering your PDF","data":{"title":"Report","content":"<h1>Report</h1><p>Body text</p>","content_format":"html"}}
```

## delete_document
**Required keys:** `document_id`

Requests deletion of a document. Returns a confirmation card the user must approve.

```json
{"action":"delete_document","label":"Removing your document","data":{"document_id":"UUID"}}
```

## delete_email
**Required keys:** `email_id`

**Types:** `email_id`: string

Requests deletion of an email draft artifact. Returns a confirmation card the user must approve before anything is deleted.

```json
{"action":"delete_email","label":"Removing email draft","data":{"email_id":"UUID"}}
```

## get_document
**Required keys:** `document_id`

**Optional keys:** `space_id`, `item_id`, `asset_id`

**Aliases:** `item_id` → `document_id`, `asset_id` → `document_id`

**Types:** `document_id`: string, `space_id`: string, `item_id`: string, `asset_id`: string

Fetches one document by id. With space_id, this reads a Space Doc row from space_items; without space_id, it reads a conversation document and automatically falls back to treating the id as a Space Doc item id. When the document also lives in a space Docs view and that copy is newer (edited in the Docs UI), content returns the space copy and space_item_id/space_id are included — so you always read the latest version. Use document_id from save_document/list_documents. item_id and legacy asset_id are accepted aliases, but document_id is preferred.

```json
{"action":"get_document","label":"Loading your document","data":{"space_id":"UUID","document_id":"UUID"}}
```

```json
{"action":"get_document","label":"Loading your document","data":{"document_id":"UUID"}}
```

```json
{"action":"get_document","label":"Loading your document","data":{"asset_id":"UUID"}}
```

## get_email
**Required keys:** `email_id`

**Types:** `email_id`: string

Fetches one draft email artifact by id.

```json
{"action":"get_email","label":"Loading email draft","data":{"email_id":"UUID"}}
```

## list_documents
**Optional keys:** `space_id`, `campaign_id`, `scope`, `parent_item_id`, `doc_source`, `search`, `query`, `limit`

**Aliases:** `query` → `search`

**Types:** `space_id`: string, `campaign_id`: string, `scope`: string, `parent_item_id`: string, `doc_source`: string, `search`: string, `query`: string, `limit`: number

Lists documents. In a Space chat, this defaults to the active space and returns Space Docs, including Google Drive folders/files synced into the Docs view. The response includes flat documents plus document_index, a nested folder/file tree. Pass parent_item_id to list one folder subtree. Pass search to narrow by title. Campaign-scoped calls also include campaign conversation documents with retrieve_via instructions for get_document.

```json
{"action":"list_documents","label":"Reviewing your docs","data":{}}
```

```json
{"action":"list_documents","label":"Finding your doc","data":{"search":"Hadassah Cyprus"}}
```

```json
{"action":"list_documents","label":"Opening folder","data":{"space_id":"UUID","parent_item_id":"FOLDER_ITEM_UUID","limit":100}}
```

## list_emails
**Optional keys:** `campaign_id`, `space_id`, `source_item_id`, `status`, `limit`, `scope_override`

**Types:** `campaign_id`: string, `space_id`: string, `source_item_id`: string, `status`: string, `limit`: number, `scope_override`: boolean

Lists draft email artifacts. Use when reviewing email drafts created by agents or automations. Campaign context is resolved automatically when available; optionally filter by space_id or source_item_id.

```json
{"action":"list_emails","label":"Loading email drafts","data":{"space_id":"UUID","source_item_id":"UUID","limit":25}}
```

## read_space_document
**Required keys:** `space_id`, `document_id`

**Optional keys:** `item_id`, `limit`

**Aliases:** `item_id` → `document_id`

**Types:** `space_id`: string, `document_id`: string, `item_id`: string, `limit`: number

Reads a Space Doc body by space item id. Native docs return doc_body/notes. Google Drive docs fetch readable Drive export content on demand using _drive_file_id. Folder docs return children plus document_index, a recursive folder/file tree, instead of body text.

```json
{"action":"read_space_document","label":"Reading this doc","data":{"space_id":"UUID","document_id":"SPACE_ITEM_UUID"}}
```

## save_document
**Required keys:** `title`, `content`

**Optional keys:** `campaign_id`, `space_id`, `conversation_id`, `document_type`, `deliverable_id`, `status`, `priority`, `assignee_type`, `assignee_id`, `start_date`, `due_date`, `description`, `notes`, `parent_item_id`, `sort_order`, `recurrence`, `category`, `custom_data`

**Types:** `campaign_id`: string, `space_id`: string, `conversation_id`: string, `title`: string, `document_type`: string, `deliverable_id`: string, `status`: string, `priority`: string, `category`: string, `assignee_type`: string, `assignee_id`: string, `start_date`: iso_date, `due_date`: iso_date, `description`: string, `notes`: string, `parent_item_id`: string, `sort_order`: number, `recurrence`: object, `custom_data`: object

**Use when:** Save a document into the active conversation, campaign, or space context.

Saves a document artifact. User sees: document card in Studio > Documents. When: packaging a deliverable, report, or strategy document for the user to download or reference. Campaign is resolved automatically from the session — do NOT pass campaign_id in data.

**FORMATTING RULES for `content.text` (REQUIRED):**
- Write `content.text` as **GitHub-flavored Markdown**. Use `#`/`##`/`###` for headings, `**bold**`, `*italic*`, `-` for bullets, `1.` for numbered lists.
- **Whenever data has rows/columns, comparisons, attributes, or repeated key→value pairs, you MUST use a Markdown table.** Never concatenate `**Label**value**Label**value` in a single paragraph — that renders as unreadable text.
- Markdown table syntax:
  ```
  | Field     | Value                          |
  | --------- | ------------------------------ |
  | Section   | Opening → The Problem          |
  | Component | SlideTheShift                  |
  | Change    | Full copy rewrite              |
  ```
- Examples that REQUIRE a table: slide-by-slide breakdowns, feature comparisons, scoring matrices, pricing tiers, schedules, metric definitions, any "X | Y" data, any "Field: Value" list with 3+ entries.
- Do not output raw HTML `<table>` tags. Use Markdown pipes — the renderer converts them.

**DUAL SURFACES:** When saved inside a space, the response also returns space_item_id — the same document shown in the space Docs view. update_document accepts either document_id or space_item_id and keeps both copies in sync.

```json
{"action":"save_document","label":"Packaging your deliverable","data":{"title":"Report","document_type":"offer","content":{"text":"# Title\n\n## Section\n\nIntro paragraph.\n\n| Field | Value |\n| ----- | ----- |\n| A | 1 |\n| B | 2 |\n"}}}
```

Contract example: save a campaign document
```json
{"action":"save_document","label":"save a campaign document","data":{"campaign_id":"UUID","title":"Brief","content":"# Brief\nNotes"}}
```

## save_email
**Required keys:** `subject`, `body`, `space_id`, `source_item_id`

**Optional keys:** `campaign_id`, `scope_override`

**Types:** `subject`: string, `body`: string, `space_id`: string, `source_item_id`: string, `campaign_id`: string, `scope_override`: boolean

Saves a draft email artifact linked to a source task. Use only when an automation asks for an email artifact output. Required: subject, body, space_id, source_item_id. Do not include recipients; the Send Email automation defines To/CC.

```json
{"action":"save_email","label":"Saving email draft","data":{"subject":"Follow-up draft","body":"Hi...","space_id":"UUID","source_item_id":"UUID"}}
```

## update_document
**Required keys:** `document_id`

**Optional keys:** `title`, `content`, `document_type`, `item_id`, `asset_id`, `status`, `priority`, `assignee_type`, `assignee_id`, `start_date`, `due_date`, `description`, `notes`, `parent_item_id`, `sort_order`, `recurrence`, `category`, `custom_data`

**Aliases:** `item_id` → `document_id`, `asset_id` → `document_id`

**Types:** `document_id`: string, `title`: string, `document_type`: string, `item_id`: string, `asset_id`: string, `status`: string, `priority`: string, `category`: string, `assignee_type`: string, `assignee_id`: string, `start_date`: iso_date, `due_date`: iso_date, `description`: string, `notes`: string, `parent_item_id`: string, `sort_order`: number, `recurrence`: object, `custom_data`: object

**Use when:** Update a document title, content, or document_type. Accepts the conversation document_id or the Space Doc item id; linked copies are kept in sync.

Updates a document title, content, or document_type. Accepts EITHER the conversation document_id (from save_document/get_document) OR the Space Doc item id (from list_documents/read_space_document) — the link is resolved automatically and BOTH copies are updated, so the space Docs view stays in sync. If the user edited the doc in the Docs UI more recently than the conversation copy, those edits win unless you pass new content — re-read the document before rewriting content if the user may have edited it manually. Google Drive synced docs cannot be updated here.

```json
{"action":"update_document","label":"Updating your document","data":{"document_id":"UUID","title":"Updated Title"}}
```

```json
{"action":"update_document","label":"Updating your document","data":{"document_id":"SPACE_ITEM_UUID","content":{"text":"# Updated body"}}}
```

## update_email
**Required keys:** `email_id`, `subject,body`

**Optional keys:** `subject`, `body`

**Types:** `email_id`: string, `subject`: string, `body`: string

Updates a draft email artifact subject and/or body. Use when revising an existing email draft rather than creating a new one.

```json
{"action":"update_email","label":"Updating email draft","data":{"email_id":"UUID","subject":"Updated subject","body":"Updated body"}}
```
