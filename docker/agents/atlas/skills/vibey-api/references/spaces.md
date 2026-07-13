# Spaces

## generate_visual_html
**Required keys:** `item_id`

**Optional keys:** `space_id`, `style_hint`, `prompt`, `force`

**Types:** `item_id`: string, `space_id`: string, `style_hint`: string, `prompt`: string, `force`: boolean

Turns a Space doc (rich-text notes on a space_items row with _view_type="doc") into a self-contained HTML Visual Doc — a designed, presentation-ready render of the same content. User sees: a Visual Doc card in chat and a Visual tab on the doc in the space. When: the user asks to visualize, design, turn into a visual doc, make this look polished, or asks for an HTML/one-pager version of a doc. Pass item_id of the source doc. Optionally pass style_hint (report, one-pager, landing, tree, etc.) and prompt for extra direction. The source HTML is read automatically from space_items.notes — do not pass it. The generated output is pure HTML, not TSX: one self-contained document with inline CSS, no scripts, and no external network calls.

```json
{"action":"generate_visual_html","label":"Designing your visual doc","data":{"item_id":"UUID","style_hint":"one-pager","prompt":"Bold hero with the offer, then a 3-column benefits row"}}
```
