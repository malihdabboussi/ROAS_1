export type VibeyActionDoc = {
  section: string
  description: string
  parameters: string
}

export const VIBEY_API_ACTION_DOCS: Record<string, VibeyActionDoc> = {
  describe_action: {
    section: 'General',
    description:
      'Returns the exact data contract for one backend action. Use before calling an action when the exact payload fields are not already in context.',
    parameters:
      '```json\n{"action":"describe_action","label":"Checking action contract","data":{"action_name":"update_presentation"}}\n```',
  },
  search_vibey_docs: {
    section: 'General',
    description:
      'Searches Vibey product and platform documentation. Use before guessing about Vibey features, backend actions, policies, or UI behavior when the answer should be grounded in internal docs. Required: query. Optional: match_count and min_similarity.',
    parameters:
      '```json\n{"action":"search_vibey_docs","label":"Searching Vibey docs","data":{"query":"how space automation flows set task status","match_count":5}}\n```',
  },
  create_offer: {
    section: 'Offers',
    description:
      'Creates a new offer with optional step 1 payload. User sees: offer card in Studio > Offers. When: user describes their product/service value proposition. Call update_offer_step for steps 2-6 after creation.',
    parameters:
      '```json\n{"action":"create_offer","label":"Crafting your offer","data":{"name":"Offer Name"}}\n```',
  },
  update_offer_step: {
    section: 'Offers',
    description: 'Updates one offer step (2-6) for an existing offer. **offer_id is REQUIRED**.',
    parameters:
      '```json\n{"action":"update_offer_step","label":"Updating your offer","data":{"offer_id":"UUID","step_number":2,"step_data":{}}}\n```',
  },
  get_offer: {
    section: 'Offers',
    description: 'Fetches a single offer by id. **offer_id is REQUIRED**.',
    parameters:
      '```json\n{"action":"get_offer","label":"Fetching your offer","data":{"offer_id":"UUID"}}\n```',
  },
  list_offers: {
    section: 'Offers',
    description: 'Lists offers for current campaign.',
    parameters: '```json\n{"action":"list_offers","label":"Reviewing your offers","data":{}}\n```',
  },
  delete_offer: {
    section: 'Offers',
    description:
      'Requests deletion of an offer. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_offer","label":"Removing your offer","data":{"offer_id":"UUID"}}\n```',
  },
  create_funnel: {
    section: 'Funnels',
    description:
      'Creates a new funnel. User sees: funnel card in Studio > Funnels with live preview. When: user needs a landing page, opt-in page, or multi-page site. Add pages with add_funnel_page after creation.',
    parameters:
      '```json\n{"action":"create_funnel","label":"Setting up your funnel","data":{"name":"Free Guide Funnel","slug":"free-guide-funnel","funnel_type":"lead-magnet"}}\n```',
  },
  add_funnel_page: {
    section: 'Funnels',
    description:
      'Adds a NEW page to a funnel as an HTML file bundle. Pass files with an index.html entry (plain HTML document) plus optional styles.css/page.js. Build pages in order (opt-in → thank-you → sales). Write-then-lint: valid files save immediately; syntactically broken files come back in rejected_files (fix with write_funnel_file) and reference problems in bundle_errors. The page is done only when bundle_errors is empty. Never use this to edit an existing page.',
    parameters:
      '```json\n{"action":"add_funnel_page","label":"Designing your page","data":{"funnel_id":"UUID","name":"Free Guide Opt-in","slug":"free-guide-opt-in","page_type":"opt-in","order_index":0,"files":[{"path":"index.html","role":"entry","content":"<!doctype html><html>...</html>"},{"path":"styles.css","role":"style","content":":root { --color-primary: #10b981; }"}]}}\n```',
  },
  update_funnel_page: {
    section: 'Funnels',
    description:
      'Full-replace or metadata-only update of an existing page. Pass files ONLY with replace_entire_page: true for a full redesign; pass name/slug/path/order_index for metadata. For any copy, section, or style change use patch_funnel_file or write_funnel_file instead — never rewrite the whole page for a small edit.',
    parameters:
      '```json\n{"action":"update_funnel_page","label":"Redesigning your page","data":{"funnel_page_id":"UUID","replace_entire_page":true,"files":[{"path":"index.html","role":"entry","content":"<!doctype html><html>...</html>"}]}}\n```',
  },
  list_funnel_files: {
    section: 'Funnels',
    description:
      'Lists source files in an HTML bundle funnel. Returns page-scoped files plus funnel-shared files (shared/styles.css, shared/nav.html, shared/footer.html). Pass funnel_page_id to scope to one page.',
    parameters:
      '```json\n{"action":"list_funnel_files","label":"Reading funnel files","data":{"funnel_id":"UUID","funnel_page_id":"UUID"}}\n```',
  },
  read_funnel_file: {
    section: 'Funnels',
    description:
      'Reads one source file from an HTML bundle funnel. Pass funnel_page_id for a page file; omit it for a funnel-shared file.',
    parameters:
      '```json\n{"action":"read_funnel_file","label":"Opening funnel file","data":{"funnel_id":"UUID","funnel_page_id":"UUID","path":"index.html"}}\n```',
  },
  write_funnel_file: {
    section: 'Funnels',
    description:
      'Creates or replaces one source file. With funnel_page_id it writes a page file; without it a funnel-shared file such as shared/styles.css. Syntactically broken content (unbalanced CSS, non-document entry) is rejected. Page-scoped responses include the current bundle_errors/bundle_warnings lint — iterate until bundle_errors is empty.',
    parameters:
      '```json\n{"action":"write_funnel_file","label":"Saving funnel file","data":{"funnel_id":"UUID","funnel_page_id":"UUID","path":"styles.css","content":".hero { min-height: 80vh; }","role":"style"}}\n```',
  },
  patch_funnel_file: {
    section: 'Funnels',
    description:
      'PREFERRED edit action: exact find-and-replace on one funnel source file (find must match exactly once). Use this for copy changes, class tweaks, and small style edits instead of rewriting files or pages.',
    parameters:
      '```json\n{"action":"patch_funnel_file","label":"Tuning page copy","data":{"funnel_id":"UUID","funnel_page_id":"UUID","path":"index.html","find":"Old headline","replace":"New headline"}}\n```',
  },
  delete_funnel_file: {
    section: 'Funnels',
    description:
      'Deletes one non-entry source file from a funnel bundle. index.html cannot be deleted from a page bundle.',
    parameters:
      '```json\n{"action":"delete_funnel_file","label":"Removing funnel file","data":{"funnel_id":"UUID","funnel_page_id":"UUID","path":"unused.js"}}\n```',
  },
  list_funnel_assets: {
    section: 'Funnels',
    description: 'Lists image/font asset mappings for an HTML bundle funnel.',
    parameters:
      '```json\n{"action":"list_funnel_assets","label":"Checking funnel assets","data":{"funnel_id":"UUID"}}\n```',
  },
  attach_funnel_asset: {
    section: 'Funnels',
    description:
      'Maps an uploaded media asset or asset_ref into a funnel bundle path such as assets/logo.png or fonts/brand.woff2. Assets are funnel-wide and usable from any page.',
    parameters:
      '```json\n{"action":"attach_funnel_asset","label":"Adding funnel asset","data":{"funnel_id":"UUID","path":"assets/logo.png","media_asset_id":"UUID","asset_ref":{"kind":"vibey_asset","asset_id":"UUID"},"role":"image"}}\n```',
  },
  detach_funnel_asset: {
    section: 'Funnels',
    description: 'Removes one funnel asset mapping without deleting the underlying media asset.',
    parameters:
      '```json\n{"action":"detach_funnel_asset","label":"Removing funnel asset","data":{"funnel_id":"UUID","path":"assets/logo.png"}}\n```',
  },
  apply_funnel_element_edit: {
    section: 'Funnels',
    description:
      'Applies a surgical edit to an HTML bundle funnel page from Markup/Edit context. Use the selected element context: path, exact text_snapshot/find, source_hint, or anchor_id. If the target is ambiguous, ask for clarification instead of guessing.',
    parameters:
      '```json\n{"action":"apply_funnel_element_edit","label":"Editing selected text","data":{"funnel_id":"UUID","funnel_page_id":"UUID","path":"index.html","text_snapshot":"Old headline","value":"New headline"}}\n```',
  },
  add_funnel_anchor: {
    section: 'Funnels',
    description:
      'Adds a persistent data-comment-anchor to an exact HTML source snippet so future comments and edits can target the same element.',
    parameters:
      '```json\n{"action":"add_funnel_anchor","label":"Anchoring selected element","data":{"funnel_id":"UUID","funnel_page_id":"UUID","path":"index.html","find":"<h1>Headline</h1>","anchor_id":"hero-headline"}}\n```',
  },
  extract_funnel_tweaks: {
    section: 'Funnels',
    description:
      'Lists tweak marker availability in funnel source files. Tweak markers use /*EDITMODE-BEGIN*/ JSON /*EDITMODE-END*/ and drive the no-AI Tweaks panel.',
    parameters:
      '```json\n{"action":"extract_funnel_tweaks","label":"Checking tweak controls","data":{"funnel_id":"UUID"}}\n```',
  },
  update_funnel_tweaks: {
    section: 'Funnels',
    description:
      'Writes a funnel source file that contains updated tweak marker JSON. Preserve source outside the marker block exactly.',
    parameters:
      '```json\n{"action":"update_funnel_tweaks","label":"Saving tweak controls","data":{"funnel_id":"UUID","funnel_page_id":"UUID","path":"styles.css","content":"/*EDITMODE-BEGIN*/{...}/*EDITMODE-END*/"}}\n```',
  },
  get_funnel: {
    section: 'Funnels',
    description: 'Fetches one funnel with pages.',
    parameters:
      '```json\n{"action":"get_funnel","label":"Loading your funnel","data":{"funnel_id":"UUID"}}\n```',
  },
  list_funnels: {
    section: 'Funnels',
    description: 'Lists funnels for current campaign.',
    parameters:
      '```json\n{"action":"list_funnels","label":"Reviewing your funnels","data":{}}\n```',
  },
  delete_funnel: {
    section: 'Funnels',
    description:
      'Requests deletion of a funnel. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_funnel","label":"Removing your funnel","data":{"funnel_id":"UUID"}}\n```',
  },
  create_form: {
    section: 'Forms',
    description:
      'Creates a native Vibey Form with full schema/questions and settings. Use schema.questions for fields and settings for colors, cover/logo/end-page image URLs, target Space, redirect, branding, CAPTCHA, assignee, and submission behavior.',
    parameters:
      '```json\n{"action":"create_form","label":"Building your form","data":{"campaign_id":"UUID","name":"Client Intake","schema":{"title":"Client Intake","questions":[{"id":"name","type":"short_text","label":"Name","required":true}]},"settings":{"button_label":"Submit","cover_url":"https://example.com/cover.png","colors":{"primary":"#111827"}}}}\n```',
  },
  update_form: {
    section: 'Forms',
    description:
      'Updates a native Vibey Form. Pass schema to replace the form structure, settings to replace settings, or settings_patch to merge colors/behavior changes without wiping existing settings. For user-uploaded or campaign media images, use attach_form_asset.',
    parameters:
      '```json\n{"action":"update_form","label":"Updating your form","data":{"form_id":"UUID","settings_patch":{"end_page_title":"Thanks","end_page_icon_image_url":"https://example.com/check.png"}}}\n```',
  },
  attach_form_asset: {
    section: 'Forms',
    description:
      'Attaches a user-uploaded, connected, or campaign media image to a native Vibey Form slot. Use placement cover for the hero image, icon/logo for the form logo, and end_page_icon/thank_you for the completion screen. Prefer asset_ref when the file came from upload or an integration; media_asset_id and file_url still work.',
    parameters:
      '```json\n{"action":"attach_form_asset","label":"Adding image to your form","data":{"form_id":"UUID","placement":"cover","asset_ref":{"kind":"vibey_asset","asset_id":"UUID"},"focal_y":45}}\n```\nWith campaign media:\n```json\n{"action":"attach_form_asset","label":"Adding logo to your form","data":{"form_id":"UUID","placement":"icon","media_asset_id":"UUID"}}\n```',
  },
  get_form: {
    section: 'Forms',
    description: 'Fetches one native Vibey Form with schema, settings, publication state, and URL.',
    parameters:
      '```json\n{"action":"get_form","label":"Loading your form","data":{"form_id":"UUID"}}\n```',
  },
  list_forms: {
    section: 'Forms',
    description: 'Lists native Vibey Forms for the current campaign or an explicit campaign_id.',
    parameters:
      '```json\n{"action":"list_forms","label":"Reviewing your forms","data":{"campaign_id":"UUID"}}\n```',
  },
  publish_form: {
    section: 'Forms',
    description:
      'Publishes a native Vibey Form and returns the public form URL. The form renders from the saved schema/settings and accepts responses through the public form runtime.',
    parameters:
      '```json\n{"action":"publish_form","label":"Publishing your form","data":{"form_id":"UUID"}}\n```',
  },
  unpublish_form: {
    section: 'Forms',
    description: 'Moves a published native Vibey Form back to draft status.',
    parameters:
      '```json\n{"action":"unpublish_form","label":"Unpublishing your form","data":{"form_id":"UUID"}}\n```',
  },
  list_form_responses: {
    section: 'Forms',
    description: 'Lists recent responses for one native Vibey Form.',
    parameters:
      '```json\n{"action":"list_form_responses","label":"Reading form responses","data":{"form_id":"UUID","limit":25}}\n```',
  },
  create_website: {
    section: 'Website',
    description:
      'Creates a new multi-page website with shared navigation and footer. Use this when building a full website — not a single landing page or funnel. Add pages with add_website_page and set the shared layout with set_website_layout.',
    parameters:
      '```json\n{"action":"create_website","label":"Setting up your website","data":{"name":"Business Name — Website","slug":"business-name"}}\n```',
  },
  add_website_page: {
    section: 'Website',
    description:
      'Adds a NEW page to a website as an HTML file bundle. Pass files with an index.html entry. Build Home first to set the design language, then remaining pages. The path must match what you set in the nav layout. The bundle is validated before saving.',
    parameters:
      '```json\n{"action":"add_website_page","label":"Designing your page","data":{"funnel_id":"UUID","name":"Home","slug":"home","path":"/","page_type":"home","order_index":0,"files":[{"path":"index.html","role":"entry","content":"<!doctype html><html>...</html>"}]}}\n```',
  },
  update_website_page: {
    section: 'Website',
    description:
      'Full-replace of an existing website page (pass files) or metadata update. For any copy, section, or style change use patch_funnel_file or write_funnel_file instead.',
    parameters:
      '```json\n{"action":"update_website_page","label":"Refining your page","data":{"funnel_page_id":"UUID","files":[{"path":"index.html","role":"entry","content":"<!doctype html><html>...</html>"}]}}\n```',
  },
  get_website: {
    section: 'Website',
    description: 'Fetches one website with all its pages.',
    parameters:
      '```json\n{"action":"get_website","label":"Loading your website","data":{"funnel_id":"UUID"}}\n```',
  },
  list_websites: {
    section: 'Website',
    description: 'Lists all websites for the current campaign.',
    parameters:
      '```json\n{"action":"list_websites","label":"Reviewing your websites","data":{}}\n```',
  },
  delete_website: {
    section: 'Website',
    description:
      'Requests deletion of a website. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_website","label":"Removing your website","data":{"funnel_id":"UUID"}}\n```',
  },
  create_sequence: {
    section: 'Sequences',
    description:
      'Creates an email sequence. User sees: sequence card in Studio > Sequences with email timeline. When: user needs automated email flow (welcome, nurture, launch). Add emails with add_sequence_email after creation.',
    parameters:
      '```json\n{"action":"create_sequence","label":"Mapping your sequence","data":{"name":"Welcome","trigger":{"type":"funnel_optin"},"config":{"sequence_type":"welcome"}}}\n```',
  },
  add_sequence_email: {
    section: 'Sequences',
    description:
      'Adds one email to a sequence. User sees: email card in sequence timeline. Add emails in order_index order. First email typically has delay_hours: 0.',
    parameters:
      '```json\n{"action":"add_sequence_email","label":"Drafting your email","data":{"sequence_id":"UUID","subject":"Subject","body":"Body","delay_hours":0,"order_index":0}}\n```',
  },
  update_sequence_email: {
    section: 'Sequences',
    description:
      'Updates an existing email in a sequence. Pass sequence_email_id and fields to update.',
    parameters:
      '```json\n{"action":"update_sequence_email","label":"Updating your email","data":{"sequence_email_id":"UUID","subject":"Updated Subject","body":"Updated body"}}\n```',
  },
  get_sequence: {
    section: 'Sequences',
    description: 'Fetches one sequence with its emails, including each email body for copy review.',
    parameters:
      '```json\n{"action":"get_sequence","label":"Loading your sequence","data":{"sequence_id":"UUID"}}\n```',
  },
  get_sequence_email: {
    section: 'Sequences',
    description:
      'Fetches one sequence email by sequence_email_id, including subject and body. Use this for reviewing or quoting one email inside a sequence. Do not use get_email for sequence emails; get_email is only for draft email artifacts.',
    parameters:
      '```json\n{"action":"get_sequence_email","label":"Loading sequence email","data":{"sequence_email_id":"UUID"}}\n```',
  },
  update_sequence: {
    section: 'Sequences',
    description: 'Updates a sequence name, trigger, config, or status.',
    parameters:
      '```json\n{"action":"update_sequence","label":"Updating your sequence","data":{"sequence_id":"UUID","name":"Updated Name"}}\n```',
  },
  list_sequences: {
    section: 'Sequences',
    description: 'Lists sequences for current campaign.',
    parameters:
      '```json\n{"action":"list_sequences","label":"Reviewing your sequences","data":{}}\n```',
  },
  delete_sequence: {
    section: 'Sequences',
    description:
      'Requests deletion of a sequence. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_sequence","label":"Removing your sequence","data":{"sequence_id":"UUID"}}\n```',
  },
  delete_sequence_email: {
    section: 'Sequences',
    description:
      'Requests deletion of a sequence email. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_sequence_email","label":"Removing sequence email","data":{"sequence_email_id":"UUID"}}\n```',
  },
  create_presentation: {
    section: 'Presentations',
    description:
      'Creates a fixed-stage, theme-native presentation as an HTML-first file bundle. Pass files with index.html as the entry file. Use bundle-relative paths for styles, scripts, images, and fonts. Wrap slides in <section> elements for PDF/PPTX export. Author each slide on a 1280x720 stage; do not use viewport-driven slide layout such as min-height: 100vh, auto-fit grids, or vw-scaled type. Use Theme tokens in styles.css (`var(--color-*)`, `var(--font-*)`, `var(--design-*)`, spacing, typography) and mark the document with data-vibey-theme-native="true". Use React+Babel only when interactivity is required.',
    parameters:
      '```json\n{"action":"create_presentation","label":"Building your presentation","data":{"name":"Guide","source_mode":"html_bundle","entry_file":"index.html","files":[{"path":"index.html","role":"entry","content":"<!doctype html><html data-vibey-theme-native=\\"true\\"><head><meta name=\\"viewport\\" content=\\"width=1280, initial-scale=1\\"><link rel=\\"stylesheet\\" href=\\"styles.css\\"></head><body><main class=\\"deck\\"><section class=\\"slide\\"><div class=\\"safe\\"><h1 class=\\"headline\\">...</h1></div></section></main></body></html>"},{"path":"styles.css","role":"style","content":":root { --color-primary: #10b981; --color-heading: #161616; --font-heading: Inter, system-ui, sans-serif; --design-block-radius: 16px; } * { box-sizing: border-box; } body { margin: 0; width: 1280px; background: var(--color-page-background, #fafafa); color: var(--color-body, #5c5c5c); font-family: var(--font-body, Inter, system-ui, sans-serif); } .deck { width: 1280px; margin: 0; } .slide { position: relative; width: 1280px; height: 720px; overflow: hidden; background: var(--color-slide-background, #fafafa); } .safe { width: 1040px; height: 560px; margin: 80px auto; } .headline { color: var(--color-heading); font-family: var(--font-heading); font-size: 68px; line-height: .95; }"}]}}\n```',
  },
  update_presentation: {
    section: 'Presentations',
    description:
      'Updates a presentation. To rename the presentation, pass name. To replace the entire HTML bundle, pass files. For small edits inside one source file, use patch_presentation_file instead.',
    parameters:
      'Rename:\n```json\n{"action":"update_presentation","label":"Renaming your presentation","data":{"presentation_id":"UUID","name":"The Test. The Practice."}}\n```\n\n' +
      'Replace full HTML bundle:\n```json\n{"action":"update_presentation","label":"Refining your presentation","data":{"presentation_id":"UUID","files":[{"path":"index.html","role":"entry","content":"<!doctype html><html>...</html>"}]}}\n```',
  },
  list_presentations: {
    section: 'Presentations',
    description: 'Lists presentations for current campaign.',
    parameters:
      '```json\n{"action":"list_presentations","label":"Checking your presentations","data":{}}\n```',
  },
  get_presentation: {
    section: 'Presentations',
    description: 'Fetches one presentation by id.',
    parameters:
      '```json\n{"action":"get_presentation","label":"Loading your presentation","data":{"presentation_id":"UUID"}}\n```',
  },
  patch_presentation: {
    section: 'Presentations',
    description:
      'Legacy TSX patch action for older presentations that still store generated_html. For HTML-first presentations, use patch_presentation_file.',
    parameters:
      'Marker patch:\n```json\n{"action":"patch_presentation","label":"Tuning slide copy","data":{"presentation_id":"UUID","marker_id":"slide3.headline","patch_type":"text","value":"New Headline"}}\n```\n\n' +
      'Fallback find/replace:\n```json\n{"action":"patch_presentation","label":"Fixing slide text","data":{"presentation_id":"UUID","fallback_find":"Old Text","fallback_replace":"New Text"}}\n```',
  },
  list_presentation_files: {
    section: 'Presentations',
    description: 'Lists source files in an HTML-first presentation bundle.',
    parameters:
      '```json\n{"action":"list_presentation_files","label":"Reading presentation files","data":{"presentation_id":"UUID"}}\n```',
  },
  read_presentation_file: {
    section: 'Presentations',
    description: 'Reads one source file from an HTML-first presentation bundle.',
    parameters:
      '```json\n{"action":"read_presentation_file","label":"Opening presentation file","data":{"presentation_id":"UUID","path":"index.html"}}\n```',
  },
  write_presentation_file: {
    section: 'Presentations',
    description: 'Creates or replaces one source file in an HTML-first presentation bundle.',
    parameters:
      '```json\n{"action":"write_presentation_file","label":"Saving presentation file","data":{"presentation_id":"UUID","path":"styles.css","content":".slide { width: 1280px; height: 720px; overflow: hidden; }","role":"style"}}\n```',
  },
  patch_presentation_file: {
    section: 'Presentations',
    description:
      'Find-and-replace on one presentation source file. Use for small copy/style changes where the find string matches exactly once.',
    parameters:
      '```json\n{"action":"patch_presentation_file","label":"Tuning slide copy","data":{"presentation_id":"UUID","path":"index.html","find":"Old headline","replace":"New headline"}}\n```',
  },
  delete_presentation_file: {
    section: 'Presentations',
    description: 'Deletes one non-entry source file from an HTML-first presentation bundle.',
    parameters:
      '```json\n{"action":"delete_presentation_file","label":"Removing presentation file","data":{"presentation_id":"UUID","path":"unused.js"}}\n```',
  },
  show_presentation_file: {
    section: 'Presentations',
    description:
      'Shows one presentation source file. Defaults to index.html in the handler when no path is supplied.',
    parameters:
      '```json\n{"action":"show_presentation_file","label":"Showing presentation source","data":{"presentation_id":"UUID","path":"index.html"}}\n```',
  },
  list_presentation_assets: {
    section: 'Presentations',
    description: 'Lists image/font asset mappings for an HTML-first presentation bundle.',
    parameters:
      '```json\n{"action":"list_presentation_assets","label":"Checking presentation assets","data":{"presentation_id":"UUID"}}\n```',
  },
  attach_presentation_asset: {
    section: 'Presentations',
    description:
      'Maps an uploaded media asset or asset_ref into a presentation bundle path such as assets/logo.png or fonts/brand.woff2.',
    parameters:
      '```json\n{"action":"attach_presentation_asset","label":"Adding presentation asset","data":{"presentation_id":"UUID","path":"assets/logo.png","media_asset_id":"UUID","asset_ref":{"kind":"vibey_asset","asset_id":"UUID"},"role":"image"}}\n```',
  },
  detach_presentation_asset: {
    section: 'Presentations',
    description:
      'Removes one presentation asset mapping without deleting the underlying media asset.',
    parameters:
      '```json\n{"action":"detach_presentation_asset","label":"Removing presentation asset","data":{"presentation_id":"UUID","path":"assets/logo.png"}}\n```',
  },
  apply_presentation_element_edit: {
    section: 'Presentations',
    description:
      'Applies a surgical edit to an HTML-first presentation source file from full-mode Markup/Edit context. Use the selected element context: source_file/path, exact text_snapshot/find, source_hint, or anchor_id. If the target is ambiguous, ask for clarification instead of guessing.',
    parameters:
      '```json\n{"action":"apply_presentation_element_edit","label":"Editing selected slide text","data":{"presentation_id":"UUID","path":"index.html","text_snapshot":"Old headline","value":"New headline"}}\n```',
  },
  add_presentation_anchor: {
    section: 'Presentations',
    description:
      'Adds a persistent data-comment-anchor to an exact HTML source snippet so future comments and edits can target the same element.',
    parameters:
      '```json\n{"action":"add_presentation_anchor","label":"Anchoring selected element","data":{"presentation_id":"UUID","path":"index.html","find":"<h1>Headline</h1>","anchor_id":"hero-headline"}}\n```',
  },
  extract_presentation_tweaks: {
    section: 'Presentations',
    description:
      'Lists tweak marker availability in presentation source files. Tweak markers use /*EDITMODE-BEGIN*/ JSON /*EDITMODE-END*/ and drive the no-AI Tweaks panel.',
    parameters:
      '```json\n{"action":"extract_presentation_tweaks","label":"Checking tweak controls","data":{"presentation_id":"UUID"}}\n```',
  },
  update_presentation_tweaks: {
    section: 'Presentations',
    description:
      'Writes a presentation source file that contains updated tweak marker JSON. Preserve source outside the marker block exactly.',
    parameters:
      '```json\n{"action":"update_presentation_tweaks","label":"Saving tweak controls","data":{"presentation_id":"UUID","path":"slides.js","content":"/*EDITMODE-BEGIN*/{...}/*EDITMODE-END*/"}}\n```',
  },
  update_presentation_slide: {
    section: 'Presentations',
    description:
      'Legacy TSX slide action. Replaces one slide (by 0-based index) in an older generated_html presentation without touching other slides. New HTML-bundle decks should use read_presentation_file plus patch_presentation_file or write_presentation_file.',
    parameters:
      '```json\n{"action":"update_presentation_slide","label":"Redesigning slide 3","data":{"presentation_id":"UUID","slide_index":2,"generated_html":"<section key=\\"resources\\">...</section>"}}\n```',
  },
  add_presentation_slide: {
    section: 'Presentations',
    description:
      'Legacy TSX slide action. Inserts a new slide at the given 0-based index in an older generated_html presentation. New HTML-bundle decks should be created as one coherent bundle or edited with presentation file actions.',
    parameters:
      '```json\n{"action":"add_presentation_slide","label":"Adding a new slide","data":{"presentation_id":"UUID","slide_index":3,"generated_html":"<section key=\\"new-slide\\">...</section>"}}\n```',
  },
  delete_presentation: {
    section: 'Presentations',
    description:
      'Requests deletion of a presentation. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_presentation","label":"Removing your presentation","data":{"presentation_id":"UUID"}}\n```',
  },
  create_avatar: {
    section: 'Avatars',
    description:
      'Creates a buyer persona/avatar. User sees: persona card in Studio > Avatars. When: user is defining their target audience, ideal customer, or buyer profile for campaign targeting. persona_data MUST contain ALL 19 required sections — the call will fail with incomplete_persona if any are missing, null, empty string, or empty array. Required keys: demographics (object), core_problem (string), powerful_emotions (string or array), biggest_fears (string or array), fear_impact_on_relationships (string or array), hurtful_comments (string or array), past_attempts_to_solve (string or array), avoidance_behaviors (string or array), perfect_outcomes (string), transformation_impact (string or array), success_markers (string), secondary_gains (string), blame_targets (string or array), main_objections (string or array), background_profile (string), psychological_drivers (object), internal_voice (string), content_preferences (object), comprehensive_summary (string). Use the avatar-builder skill to generate all sections before calling create_avatar.',
    parameters:
      '```json\n{"action":"create_avatar","label":"Profiling your ideal buyer","data":{"name":"Persona Name","avatar_type":"buyer_persona","offer_id":"UUID or null","persona_data":{"demographics":{"name":"...","age":"...","career":"...","family_status":"...","lifestyle":"...","income_range":"...","daily_routine":"...","key_frustrations":["..."]},"core_problem":"...","powerful_emotions":["Emotion — Manifestation"],"biggest_fears":["..."],"fear_impact_on_relationships":["..."],"hurtful_comments":["..."],"past_attempts_to_solve":["..."],"avoidance_behaviors":["..."],"perfect_outcomes":"...","transformation_impact":["..."],"success_markers":"...","secondary_gains":"...","blame_targets":["..."],"main_objections":["..."],"background_profile":"...","psychological_drivers":{"short_term":["..."],"mid_term":["..."],"long_term":["..."]},"internal_voice":"...","content_preferences":{"voice_tone":"...","content_themes":["..."],"emotional_triggers":["..."],"ideal_messaging_tone":"..."},"comprehensive_summary":"...","avatar_image":"https://... or omit"}}}\n```',
  },
  delete_avatar: {
    section: 'Avatars',
    description:
      'Requests deletion of an avatar. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_avatar","label":"Removing your avatar","data":{"avatar_id":"UUID"}}\n```',
  },
  list_avatars: {
    section: 'Avatars',
    description: 'Lists avatars for current campaign.',
    parameters:
      '```json\n{"action":"list_avatars","label":"Reviewing buyer personas","data":{}}\n```',
  },
  get_avatar: {
    section: 'Avatars',
    description: 'Fetches one avatar by id (must belong to the user).',
    parameters:
      '```json\n{"action":"get_avatar","label":"Opening your buyer persona","data":{"avatar_id":"UUID"}}\n```',
  },
  update_avatar: {
    section: 'Avatars',
    description:
      'Updates an existing avatar. Pass avatar_id and any of: name, avatar_type, offer_id, persona_data. persona_data is shallow-merged into stored JSON (e.g. set portrait with persona_data.avatar_image only). User-defined cards live at persona_data.custom_fields as an array of {id,label,value} (string values). Replace the full array when filling/adding cards (read with get_avatar first, mutate, then send back). You may add new cards (generate a unique id) or fill empty value strings — keep label intact unless the user asked to rename it.',
    parameters:
      '```json\n{"action":"update_avatar","label":"Updating your buyer persona","data":{"avatar_id":"UUID","persona_data":{"avatar_image":"https://...","custom_fields":[{"id":"cf-...","label":"Hobbies","value":"..."}]}}}\n```',
  },
  create_theme: {
    section: 'Themes',
    description:
      'Creates and activates a campaign theme. User sees: theme in Studio > Themes, auto-applied to new funnels, presentations, and ads. Use it after verified website and campaign-media research to persist colors, fonts, logo, voice, values, social links, design settings, headshots, and product imagery. Persisted rows use flat fields — the same shape as get_theme and REST PUT /themes. Asset ids must come from campaign media; never invent one.',
    parameters:
      '```json\n{"action":"create_theme","label":"Defining your brand theme","data":{"campaign_id":"UUID","name":"Theme","colors":{"primary":"#10b981","primaryForeground":"#FFFFFF","secondaryAccent1":"#00B8D4","secondaryAccent2":"#FF5470","heading":"#161616","body":"#5C5C5C","pageBackground":"#FAFAFA","cardBackground":"#FFFFFF","border":"#E5E5E5","input":"#E7E7E7"},"font_heading":"Inter","font_body":"Inter","logo_asset_id":"UUID","headshot_images":[{"asset_id":"UUID"}],"product_images":[{"asset_id":"UUID"}],"brand_voice":{"tone":"direct"},"brand_values":{"primary":"clarity"},"social_links":{"website":"https://example.com"},"design_settings":{"buttons":{"shape":"rounded"}},"image_style_prompt":"Premium editorial photography.","status":"active"}}\n```',
  },
  list_themes: {
    section: 'Themes',
    description: 'Lists themes for current campaign.',
    parameters: '```json\n{"action":"list_themes","label":"Checking your themes","data":{}}\n```',
  },
  get_theme: {
    section: 'Themes',
    description: 'Fetches one theme by id.',
    parameters:
      '```json\n{"action":"get_theme","label":"Loading your theme","data":{"theme_id":"UUID"}}\n```',
  },
  update_theme: {
    section: 'Themes',
    description:
      'Updates a user-created theme. Pass theme_id and any fields to change (same keys as get_theme / PUT /themes): name, colors, font_heading, font_body, brand_voice, brand_values, design_settings, logo_asset_id, headshot_images, product_images, image_style_prompt, status. Partial updates are merged per field. Cannot update system themes. After extract_website_theme, map the returned tokens into these flat keys before calling update_theme.',
    parameters:
      '```json\n{"action":"update_theme","label":"Updating your theme","data":{"theme_id":"UUID","name":"Updated","colors":{"primary":"#10b981","primaryForeground":"#FFFFFF","secondaryAccent1":"#00B8D4","secondaryAccent2":"#FF5470","heading":"#161616","body":"#5C5C5C","pageBackground":"#FAFAFA","cardBackground":"#FFFFFF","border":"#E5E5E5","input":"#E7E7E7"},"font_heading":"Inter","font_body":"Inter","design_settings":{"slides":{"borderRadius":"md","shadow":"sm","borderWidth":"none","transparency":0,"accentImageShape":"rounded"},"blocks":{"fillColorMode":"subtle","borderRadius":"md","borderWidth":"none","shadow":"sm","transparency":0},"buttons":{"shape":"rounded","shadow":"sm"},"links":{"style":"underline"}}}}\n```',
  },
  delete_theme: {
    section: 'Themes',
    description:
      'Requests deletion of a theme. Returns a confirmation card the user must approve. Cannot delete system themes.',
    parameters:
      '```json\n{"action":"delete_theme","label":"Removing your theme","data":{"theme_id":"UUID"}}\n```',
  },
  extract_website_theme: {
    section: 'Themes',
    description:
      'Extracts branding tokens (colors, fonts, logo, brand voice, design settings) from the required website URL using Firecrawl. Returns structured theme data including primary/accent colors, heading/body fonts, logo URL, brand voice, and border radius/button shape settings. Map the response into flat keys (colors, font_heading, font_body, brand_voice, brand_values, design_settings, logo_asset_id only when a matching campaign-media asset exists) to match get_theme, then call create_theme or update_theme — do not wrap everything in a single config blob.',
    parameters:
      '```json\n{"action":"extract_website_theme","label":"Extracting brand identity from website","data":{"url":"https://example.com"}}\n```',
  },
  create_ad: {
    section: 'Ads',
    description:
      "Creates a new ad artifact. Do NOT use when the user asks to remake, regenerate, or change the image/creative of an existing ad — use update_ad with that ad's ad_id instead. Creating or duplicating ads when the user requested changes to a specific ad is incorrect.",
    parameters:
      '```json\n{"action":"create_ad","label":"Crafting your ad creative","data":{"platform":"meta","placement":"feed","primary_text":"...","headline":"...","destination_url":"https://..."}}\n```',
  },
  update_ad: {
    section: 'Ads',
    description:
      "Updates an existing ad artifact. Use for full field replacement (headline, copy, generated_tsx, image). For small TSX tweaks (fix a color, swap a label), use patch_ad instead — it's faster and cheaper. When regenerating an ad image: call generate_image first, then update_ad with the returned image_url and image_asset_id.",
    parameters:
      '```json\n{"action":"update_ad","label":"Polishing your ad","data":{"ad_id":"UUID","headline":"Updated","image_url":"https://...","image_asset_id":"UUID","generated_tsx":"..."}}\n```',
  },
  patch_ad: {
    section: 'Ads',
    description:
      "Find-and-replace on an ad's generated_tsx string. Use when fixing styles, swapping labels, changing colors, or any small TSX edit that doesn't require rewriting the full creative. Each find string must match exactly once (fails on 0 or >1 matches). Supports batching multiple replacements in one call. Default to patch_ad for TSX edits — only use update_ad with full generated_tsx when the ad layout needs a complete rewrite.",
    parameters:
      'Single fix:\n```json\n{"action":"patch_ad","label":"Fixing ad style","data":{"ad_id":"UUID","find":"color: \'#FFF\'","replace":"color: \'#34D399\'"}}\n```\n\n' +
      'Batch fixes:\n```json\n{"action":"patch_ad","label":"Updating ad copy","data":{"ad_id":"UUID","replacements":[{"find":"OLD HEADLINE","replace":"NEW HEADLINE"},{"find":"fontSize: 24","replace":"fontSize: 32"}]}}\n```',
  },
  list_ads: {
    section: 'Ads',
    description: 'Lists ads for current campaign.',
    parameters: '```json\n{"action":"list_ads","label":"Reviewing your ads","data":{}}\n```',
  },
  get_ad: {
    section: 'Ads',
    description: 'Fetches one ad by id.',
    parameters:
      '```json\n{"action":"get_ad","label":"Loading your ad","data":{"ad_id":"UUID"}}\n```',
  },
  delete_ad: {
    section: 'Ads',
    description: 'Requests deletion of an ad. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_ad","label":"Removing your ad","data":{"ad_id":"UUID"}}\n```',
  },
  create_ad_campaign: {
    section: 'Ads',
    description:
      'Creates ad campaign scaffold in platform data model. User sees: campaign structure in Studio > Ads. Build order: create_ad_campaign → create_ad_set → create_ad → publish_ad_to_meta.',
    parameters:
      '```json\n{"action":"create_ad_campaign","label":"Preparing campaign structure","data":{"name":"Campaign","objective":"OUTCOME_TRAFFIC","budget_type":"ABO"}}\n```',
  },
  create_ad_set: {
    section: 'Ads',
    description:
      'Creates ad set for targeting and budget. User sees: ad set under campaign in Studio > Ads. Part of publish flow: campaign → ad set → ad. targeting may include custom_audiences and excluded_custom_audiences (arrays of { id: string }) from list_meta_audiences.',
    parameters:
      '```json\n{"action":"create_ad_set","label":"Configuring your ad set","data":{"ad_campaign_id":"UUID","name":"Ad Set","targeting":{"geo_locations":{"countries":["US"]},"custom_audiences":[{"id":"META_AUDIENCE_ID"}]}}\n```',
  },
  get_ad_campaign: {
    section: 'Ads',
    description: 'Fetches one ad campaign by id.',
    parameters:
      '```json\n{"action":"get_ad_campaign","label":"Loading your ad campaign","data":{"ad_campaign_id":"UUID"}}\n```',
  },
  get_ad_set: {
    section: 'Ads',
    description: 'Fetches one ad set by id.',
    parameters:
      '```json\n{"action":"get_ad_set","label":"Loading your ad set","data":{"ad_set_id":"UUID"}}\n```',
  },
  update_ad_campaign: {
    section: 'Meta',
    description:
      'Updates an existing ad campaign on Meta. Only works for campaigns already published to Meta. Cannot change objective (immutable).',
    parameters:
      '```json\n{"action":"update_ad_campaign","label":"Updating campaign on Meta","data":{"ad_campaign_id":"UUID","name":"Updated Campaign","daily_budget":5000,"status":"ACTIVE"}}\n```',
  },
  update_ad_set: {
    section: 'Meta',
    description:
      'Updates an existing ad set on Meta. Only works for ad sets already published to Meta. Can update targeting, budget, schedule, and optimization settings.',
    parameters:
      '```json\n{"action":"update_ad_set","label":"Updating ad set on Meta","data":{"ad_set_id":"UUID","name":"Updated Ad Set","daily_budget":2000,"targeting":{"geo_locations":{"countries":["US"]},"age_min":25,"age_max":45}}}\n```',
  },
  check_meta_connection: {
    section: 'Meta',
    description: 'Checks Meta integration status.',
    parameters:
      '```json\n{"action":"check_meta_connection","label":"Checking Meta connection","data":{}}\n```',
  },
  list_meta_ad_accounts: {
    section: 'Meta',
    description: 'Lists available Meta ad accounts.',
    parameters:
      '```json\n{"action":"list_meta_ad_accounts","label":"Loading ad accounts","data":{}}\n```',
  },
  list_meta_pages: {
    section: 'Meta',
    description: 'Lists available Meta pages.',
    parameters: '```json\n{"action":"list_meta_pages","label":"Loading your pages","data":{}}\n```',
  },
  publish_ad_to_meta: {
    section: 'Meta',
    description:
      'Publishes a local ad or campaign structure to Meta in PAUSED state for review. This does not authorize live delivery. Requires Meta connected and exact account settings approved.',
    parameters:
      '```json\n{"action":"publish_ad_to_meta","label":"Building your paused Meta campaign","data":{"campaign_id":"LOCAL_CAMPAIGN_UUID","ad_account_id":"act_...","page_id":"...","targeting":{"geo_locations":{"countries":["US"]}}}}\n```',
  },
  save_meta_defaults: {
    section: 'Meta',
    description:
      'Saves ad account, page, Instagram, and pixel defaults to a campaign without publishing. Call this immediately after the user selects their Meta settings so the campaign Settings tab stays in sync.',
    parameters:
      '```json\n{"action":"save_meta_defaults","label":"Saving your Meta settings","data":{"campaign_id":"UUID","ad_account_id":"act_...","page_id":"...","instagram_user_id":"...","pixel_id":"..."}}\n```',
  },
  get_meta_ad_status: {
    section: 'Meta',
    description: 'Fetches status for a published Meta ad.',
    parameters:
      '```json\n{"action":"get_meta_ad_status","label":"Checking ad delivery status","data":{"meta_ad_id":"..."}}\n```',
  },
  get_meta_ads_insights: {
    section: 'Meta',
    description:
      'Reads objective-specific performance from Meta. campaign_id is always the active ROAS campaign UUID, not a Meta ID. Start at level campaign. For level adset, pass the selected campaign response row.id as ad_campaign_id. For level ad, pass the selected ad-set response row.id as ad_set_id. row.meta_id is evidence only. Never put a Meta numeric ID in campaign_id. Use date_preset or exact start_date and end_date.',
    parameters:
      '```json\n{"action":"get_meta_ads_insights","label":"Pulling campaign insights","data":{"campaign_id":"ROAS_CAMPAIGN_UUID","level":"campaign","date_preset":"last_30d"}}\n```\n```json\n{"action":"get_meta_ads_insights","label":"Pulling ad-set insights","data":{"campaign_id":"ROAS_CAMPAIGN_UUID","level":"adset","ad_campaign_id":"CAMPAIGN_RESPONSE_ROW_ID","date_preset":"last_30d"}}\n```',
  },
  get_delivery_estimate: {
    section: 'Meta',
    description: 'Gets delivery estimates for an ad set.',
    parameters:
      '```json\n{"action":"get_delivery_estimate","label":"Estimating your reach","data":{"ad_set_id":"UUID"}}\n```',
  },
  list_meta_audiences: {
    section: 'Meta',
    description: 'Lists custom audiences for a Meta ad account.',
    parameters:
      '```json\n{"action":"list_meta_audiences","label":"Loading audiences","data":{"ad_account_id":"act_..."}}\n```',
  },
  create_meta_custom_audience: {
    section: 'Meta',
    description:
      'Creates a custom audience on Meta (e.g. engagement: page fans, engagers). User sees: audience available in list_meta_audiences for targeting in ad sets. Pass name and optional rule (event_sources) and retention_days.',
    parameters:
      '```json\n{"action":"create_meta_custom_audience","label":"Creating audience","data":{"ad_account_id":"act_...","name":"Page followers","rule":{"included":["page_engaged"],"event_sources":[{"type":"page","id":"PAGE_ID"}]},"retention_days":14}}\n```',
  },
  create_meta_lookalike_audience: {
    section: 'Meta',
    description:
      'Creates a lookalike audience from a seed custom audience. User sees: lookalike available in list_meta_audiences for targeting. Requires an existing custom_audience as seed.',
    parameters:
      '```json\n{"action":"create_meta_lookalike_audience","label":"Creating lookalike","data":{"ad_account_id":"act_...","name":"LLA 1% US","origin_audience_id":"META_AUDIENCE_ID","country":"US","ratio":0.01}}\n```',
  },
  list_meta_pixel_events: {
    section: 'Meta',
    description: 'Lists custom conversions (pixel events) for a Meta ad account.',
    parameters:
      '```json\n{"action":"list_meta_pixel_events","label":"Loading pixel events","data":{"ad_account_id":"act_..."}}\n```',
  },
  create_meta_pixel_event: {
    section: 'Meta',
    description:
      'Creates a custom conversion (pixel event) for a pixel. User sees: event in list_meta_pixel_events, usable for ad optimization and tracking.',
    parameters:
      '```json\n{"action":"create_meta_pixel_event","label":"Creating pixel event","data":{"ad_account_id":"act_...","name":"Lead","event_source_id":"PIXEL_ID","custom_event_type":"LEAD","rule":"url_contains:\\u0027thank-you\\u0027"}}\n```',
  },
  create_project: {
    section: 'Projects',
    description:
      'Creates a new multi-file project scaffold. User sees: project card in Projects with live app preview. Returns project object with id. Add files with create_file, set deps with update_project_deps after creation.',
    parameters:
      '```json\n{"action":"create_project","label":"Creating your project","data":{"name":"Team Ops Dashboard","description":"Internal app for team visibility"}}\n```',
  },
  get_project: {
    section: 'Projects',
    description:
      'Retrieves a single project by ID, including its metadata, dependencies, manifest, and status.',
    parameters:
      '```json\n{"action":"get_project","label":"Loading project details","data":{"project_id":"UUID"}}\n```',
  },
  list_projects: {
    section: 'Projects',
    description: 'Lists all projects owned by the current user.',
    parameters:
      '```json\n{"action":"list_projects","label":"Listing your projects","data":{}}\n```',
  },
  create_file: {
    section: 'Projects',
    description:
      'Creates a file in a project (or overwrites if it already exists). Writes to the VM filesystem instantly — Next.js hot-reloads automatically.',
    parameters:
      '```json\n{"action":"create_file","label":"Writing project file","data":{"project_id":"UUID","path":"app/page.tsx","content":"export default function Page(){ return <div>Hello</div> }"}}\n```',
  },
  update_file: {
    section: 'Projects',
    description: 'Updates an existing project file path with new content.',
    parameters:
      '```json\n{"action":"update_file","label":"Updating project file","data":{"project_id":"UUID","path":"src/components/Kanban.tsx","content":"export function Kanban(){ return <div>Board</div> }"}}\n```',
  },
  read_file: {
    section: 'Projects',
    description: 'Reads one project file content by path.',
    parameters:
      '```json\n{"action":"read_file","label":"Reading project file","data":{"project_id":"UUID","path":"package.json"}}\n```',
  },
  delete_file: {
    section: 'Projects',
    description: 'Deletes one project file by path.',
    parameters:
      '```json\n{"action":"delete_file","label":"Removing project file","data":{"project_id":"UUID","path":"src/legacy.ts"}}\n```',
  },
  list_project_files: {
    section: 'Projects',
    description: 'Lists project file paths and entry point.',
    parameters:
      '```json\n{"action":"list_project_files","label":"Reviewing project files","data":{"project_id":"UUID"}}\n```',
  },
  update_project_deps: {
    section: 'Projects',
    description: 'Updates dependency map for a project.',
    parameters:
      '```json\n{"action":"update_project_deps","label":"Updating dependencies","data":{"project_id":"UUID","dependencies":{"react":"^19.0.0","lucide-react":"^0.470.0"}}}\n```',
  },
  import_github_repo: {
    section: 'Projects',
    description: 'Imports a GitHub repository into project storage.',
    parameters:
      '```json\n{"action":"import_github_repo","label":"Importing your GitHub repo","data":{"repo_full_name":"owner/repo","branch":"main"}}\n```',
  },
  get_project_logs: {
    section: 'Projects',
    description:
      'Reads stdout/stderr from a running project app process. Use to diagnose errors when the app fails to render or crashes.',
    parameters:
      '```json\n{"action":"get_project_logs","label":"Checking app logs","data":{"project_id":"UUID"}}\n```',
  },
  validate_project: {
    section: 'Projects',
    description:
      'Runs code quality checks on a project — TypeScript type-checking, linting, and/or production build. Returns per-check pass/fail with output. Use at the end of a coding session before responding to the user, before any GitHub push or deployment, or when the user asks to verify code quality. Checks array accepts: "typescript" (tsc --noEmit), "lint" (next lint), "build" (next build).',
    parameters:
      '```json\n{"action":"validate_project","label":"Running code quality checks","data":{"project_id":"UUID","checks":["typescript","lint"]}}\n```\n\nFull gate before deploy:\n```json\n{"action":"validate_project","label":"Pre-deploy validation","data":{"project_id":"UUID","checks":["typescript","lint","build"]}}\n```',
  },
  define_object_type: {
    section: 'Custom Objects',
    description:
      'Defines a custom object schema for user-specific business data. User sees: new object type in Studio > Custom Objects. When: user needs to track deals, contacts, inventory, or any structured business data beyond standard artifacts.',
    parameters:
      '```json\n{"action":"define_object_type","label":"Defining object schema","data":{"name":"Deal","slug":"deal","fields":[{"name":"title","type":"text","required":true}]}}\n```',
  },
  list_object_types: {
    section: 'Custom Objects',
    description: 'Lists custom object schemas.',
    parameters:
      '```json\n{"action":"list_object_types","label":"Reviewing object schemas","data":{}}\n```',
  },
  get_object_type: {
    section: 'Custom Objects',
    description: 'Gets one custom object schema by id or slug.',
    parameters:
      '```json\n{"action":"get_object_type","label":"Loading object schema","data":{"slug":"deal"}}\n```',
  },
  update_object_type: {
    section: 'Custom Objects',
    description: 'Updates an existing object schema fields.',
    parameters:
      '```json\n{"action":"update_object_type","label":"Updating object schema","data":{"object_type_id":"UUID","fields":[{"name":"stage","type":"enum"}]}}\n```',
  },
  create_object: {
    section: 'Custom Objects',
    description:
      'Creates one custom object record. User sees: record card in Studio > Custom Objects under its type.',
    parameters:
      '```json\n{"action":"create_object","label":"Creating object record","data":{"object_type_id":"UUID","data":{"title":"ACME Deal","value":12000}}}\n```',
  },
  update_object: {
    section: 'Custom Objects',
    description: 'Updates one custom object record.',
    parameters:
      '```json\n{"action":"update_object","label":"Updating object record","data":{"object_id":"UUID","data":{"stage":"proposal"}}}\n```',
  },
  list_objects: {
    section: 'Custom Objects',
    description: 'Lists custom object records by type.',
    parameters:
      '```json\n{"action":"list_objects","label":"Reviewing object records","data":{"object_type":"deal","limit":20}}\n```',
  },
  get_object: {
    section: 'Custom Objects',
    description: 'Gets one custom object record.',
    parameters:
      '```json\n{"action":"get_object","label":"Loading object record","data":{"object_id":"UUID"}}\n```',
  },
  delete_object: {
    section: 'Custom Objects',
    description: 'Soft deletes a custom object record.',
    parameters:
      '```json\n{"action":"delete_object","label":"Removing object record","data":{"object_id":"UUID"}}\n```',
  },
  get_capabilities: {
    section: 'Integrations',
    description: 'Reads integration capabilities snapshot.',
    parameters:
      '```json\n{"action":"get_capabilities","label":"Checking connected capabilities","data":{}}\n```',
  },
  get_integration: {
    section: 'Integrations',
    description:
      'Gets exact action slugs for a provider. **service is REQUIRED** (e.g. "instagram", "youtube", "social_analysis", "seo_research", "ads_intelligence", "fathom", "fireflies", "zoom"). Use this for connected meeting providers before fetching a call, meeting, recording, conversation, or transcript. Social Analysis (service "social_analysis") is platform-managed for marketing/Vibey; SEO Research (service "seo_research") is platform-managed for marketing, analyst, and Vibey; Ads Intelligence (service "ads_intelligence") is platform-managed for marketing/Vibey ad-library research. Social Analysis covers social posts, comments, transcripts, trends, audiences, and Meta Ad Library depth. SEO Research covers keyword overview, keyword ideas, Google organic SERP, domain competitors, and backlinks summary. Ads Intelligence covers Meta/Google/TikTok ad-library discovery via SearchAPI.',
    parameters:
      '```json\n{"action":"get_integration","label":"Loading Ads Intelligence actions","data":{"service":"ads_intelligence"}}\n```',
  },
  search_available_integrations: {
    section: 'Integrations',
    description:
      'Semantic search for available integration actions. Use it for meeting, call, conversation, recording, or transcript requests with a query like "meeting transcript Fathom Zoom Fireflies" before asking the user to paste a transcript. Response includes user_connected (boolean) per integration. Platform-managed integrations like Social Analysis, SEO Research, and Ads Intelligence do not need a user connection when RBAC allows them; user-connected providers still require a connection before use.',
    parameters:
      '```json\n{"action":"search_available_integrations","label":"Searching integration actions","data":{"query":"meta ad library ads intelligence"}}\n```\nCall transcript discovery:\n```json\n{"action":"search_available_integrations","label":"Finding meeting transcript sources","data":{"query":"meeting transcript Fathom Zoom Fireflies"}}\n```',
  },
  initiate_integration_connect: {
    section: 'Integrations',
    description: 'Generates connect URL for an integration. **integration_id is REQUIRED**.',
    parameters:
      '```json\n{"action":"initiate_integration_connect","label":"Preparing integration connect","data":{"integration_id":"youtube"}}\n```',
  },
  check_integration_connection: {
    section: 'Integrations',
    description: 'Checks connection state for one integration. **integration_id is REQUIRED**.',
    parameters:
      '```json\n{"action":"check_integration_connection","label":"Checking integration connection","data":{"integration_id":"youtube"}}\n```',
  },
  use_integration: {
    section: 'Integrations',
    description:
      'Executes an integration action. **service is REQUIRED**, **integration_action is REQUIRED**. Put every provider-specific input inside **params** using the exact parameter names returned by get_integration or search_available_integrations; never send provider inputs flat on data. For call, meeting, conversation, recording, or transcript requests, list provider records before fetching the transcript: Fathom list_meetings then get_transcript with recordingId; Fireflies list_transcripts then get_transcript with transcriptId; Zoom uses the exact discovered action. Social Analysis: service "social_analysis" for social profiles, posts, comments, transcripts, search, trends, audience research, and Meta Ad Library depth. SEO Research: service "seo_research" for keyword overview, keyword ideas, Google organic SERP, domain competitors, and backlinks summary. Ads Intelligence: service "ads_intelligence" for Meta/Google/TikTok ad-library discovery (meta_ads_page_search, meta_ads_search, meta_ad_details, and TikTok/Google equivalents). Read the matching skill before multi-step research: social-intel for Social Analysis, seo-research for SEO Research, roas-market-research for Ads Intelligence.',
    parameters:
      '```json\n{"action":"use_integration","label":"Searching Meta Ad Library pages","data":{"service":"ads_intelligence","integration_action":"meta_ads_page_search","params":{"q":"Impact Elite Coaching"}}}\n```\nFathom transcript flow:\n```json\n{"action":"use_integration","label":"Listing Fathom meetings","data":{"service":"fathom","integration_action":"list_meetings","params":{}}}\n```\n```json\n{"action":"use_integration","label":"Reading Fathom transcript","data":{"service":"fathom","integration_action":"get_transcript","params":{"recordingId":"149415442"}}}\n```',
  },
  list_calendar_events: {
    section: 'Integrations',
    description:
      'Lists normalized Google Calendar and Outlook events for a time window. Optional provider is "google_calendar" or "outlook". Caller-scoped Home Agenda only — not org-wide Workspace calendars.',
    parameters:
      '```json\n{"action":"list_calendar_events","label":"Checking calendar","data":{"start":"2026-06-18T00:00:00.000Z","end":"2026-06-19T00:00:00.000Z","timezone":"Asia/Nicosia"}}\n```',
  },
  get_person_agenda: {
    section: 'Integrations',
    description:
      'Reads one person calendar via org Google Workspace domain-wide delegation. Resolve by email, Slack person_id, vibey_user_id, or person_brain_id. Admin/agent only — never use for member Home Agenda.',
    parameters:
      '```json\n{"action":"get_person_agenda","label":"Checking teammate calendar","data":{"email":"alex@company.com","start":"2026-06-18T00:00:00.000Z","end":"2026-06-19T00:00:00.000Z"}}\n```',
  },
  list_org_upcoming: {
    section: 'Integrations',
    description:
      'Lists upcoming Workspace calendars for mapped org people (confirmed or directory-synced). Admin/agent only.',
    parameters:
      '```json\n{"action":"list_org_upcoming","label":"Scanning team calendars","data":{"start":"2026-06-18T00:00:00.000Z","end":"2026-06-18T12:00:00.000Z","limit_people":20}}\n```',
  },
  get_person_briefing: {
    section: 'Integrations',
    description:
      'Compound person briefing on one email key: Workspace calendar + meeting/Fathom space items + Slack People + Person Brain memories + Page Grader clients. Admin/agent only.',
    parameters:
      '```json\n{"action":"get_person_briefing","label":"Preparing person briefing","data":{"email":"alex@company.com","start":"2026-06-18T00:00:00.000Z","end":"2026-06-19T00:00:00.000Z"}}\n```',
  },
  create_calendar_event: {
    section: 'Integrations',
    description:
      'Creates one timed provider-owned calendar event in Google Calendar or Outlook. When multiple accounts are connected, first use list_calendar_events and pass the selected account as user_integration_id. The result identifies the exact account used. Use create_task/update_task with start_date/due_date for task scheduling.',
    parameters:
      '```json\n{"action":"create_calendar_event","label":"Adding calendar event","data":{"provider":"google_calendar","user_integration_id":"UUID_FROM_LIST_CALENDAR_EVENTS","title":"Review launch tasks","start":"2026-06-18T10:00:00.000Z","end":"2026-06-18T10:30:00.000Z","timezone":"Asia/Nicosia"}}\n```',
  },
  update_calendar_event: {
    section: 'Integrations',
    description:
      'Updates a timed provider-owned calendar event. event_id may be the normalized id returned by list_calendar_events.',
    parameters:
      '```json\n{"action":"update_calendar_event","label":"Moving calendar event","data":{"provider":"outlook","event_id":"outlook:event-123","start":"2026-06-18T11:00:00.000Z","end":"2026-06-18T11:45:00.000Z","timezone":"Asia/Nicosia"}}\n```',
  },
  delete_calendar_event: {
    section: 'Integrations',
    description: 'Deletes one provider-owned Google Calendar or Outlook event.',
    parameters:
      '```json\n{"action":"delete_calendar_event","label":"Deleting calendar event","data":{"provider":"google_calendar","event_id":"google:event-123"}}\n```',
  },
  save_document: {
    section: 'Documents',
    description:
      'Saves a document artifact. User sees: document card in chat, and when the chat is campaign-scoped (or space_id is set) a dual-written Space Doc in that campaign\'s Docs view (space_item_id). Prefer letting campaign/space inherit from session — do NOT invent empty ids. When: packaging a deliverable, report, or strategy document for the user to download or reference. Campaign is resolved automatically from the session — do NOT pass campaign_id in data.\n\n**FORMATTING RULES for `content.text` (REQUIRED):**\n- Write `content.text` as **GitHub-flavored Markdown**. Use `#`/`##`/`###` for headings, `**bold**`, `*italic*`, `-` for bullets, `1.` for numbered lists.\n- **Whenever data has rows/columns, comparisons, attributes, or repeated key→value pairs, you MUST use a Markdown table.** Never concatenate `**Label**value**Label**value` in a single paragraph — that renders as unreadable text.\n- Markdown table syntax:\n  ```\n  | Field     | Value                          |\n  | --------- | ------------------------------ |\n  | Section   | Opening → The Problem          |\n  | Component | SlideTheShift                  |\n  | Change    | Full copy rewrite              |\n  ```\n- Examples that REQUIRE a table: slide-by-slide breakdowns, feature comparisons, scoring matrices, pricing tiers, schedules, metric definitions, any "X | Y" data, any "Field: Value" list with 3+ entries.\n- Do not output raw HTML `<table>` tags. Use Markdown pipes — the renderer converts them.\n\n**DUAL SURFACES:** When the chat is space-scoped OR campaign-scoped (and the campaign has a space), the response also returns space_item_id — the same document shown in the space Docs view. update_document accepts either document_id or space_item_id and keeps both copies in sync.',
    parameters:
      '```json\n{"action":"save_document","label":"Packaging your deliverable","data":{"title":"Report","document_type":"offer","content":{"text":"# Title\\n\\n## Section\\n\\nIntro paragraph.\\n\\n| Field | Value |\\n| ----- | ----- |\\n| A | 1 |\\n| B | 2 |\\n"}}}\n```',
  },
  list_emails: {
    section: 'Documents',
    description:
      'Lists draft email artifacts. Use when reviewing email drafts created by agents or automations. Campaign context is resolved automatically when available; optionally filter by space_id or source_item_id.',
    parameters:
      '```json\n{"action":"list_emails","label":"Loading email drafts","data":{"space_id":"UUID","source_item_id":"UUID","limit":25}}\n```',
  },
  save_email: {
    section: 'Documents',
    description:
      'Saves a draft email artifact linked to a source task. Use only when an automation asks for an email artifact output. Required: subject, body, space_id, source_item_id. Do not include recipients; the Send Email automation defines To/CC.',
    parameters:
      '```json\n{"action":"save_email","label":"Saving email draft","data":{"subject":"Follow-up draft","body":"Hi...","space_id":"UUID","source_item_id":"UUID"}}\n```',
  },
  get_email: {
    section: 'Documents',
    description: 'Fetches one draft email artifact by id.',
    parameters:
      '```json\n{"action":"get_email","label":"Loading email draft","data":{"email_id":"UUID"}}\n```',
  },
  update_email: {
    section: 'Documents',
    description:
      'Updates a draft email artifact subject and/or body. Use when revising an existing email draft rather than creating a new one.',
    parameters:
      '```json\n{"action":"update_email","label":"Updating email draft","data":{"email_id":"UUID","subject":"Updated subject","body":"Updated body"}}\n```',
  },
  delete_email: {
    section: 'Documents',
    description:
      'Requests deletion of an email draft artifact. Returns a confirmation card the user must approve before anything is deleted.',
    parameters:
      '```json\n{"action":"delete_email","label":"Removing email draft","data":{"email_id":"UUID"}}\n```',
  },
  create_pdf: {
    section: 'Documents',
    description:
      'Creates downloadable PDF from content. User sees: PDF download link in chat + document in Studio > Documents. Set content_format to "markdown" (default), "html", or "text" to match your content. If content contains HTML tags (<h1>, <p>, <table>, etc.), you MUST set content_format: "html" — otherwise tags print as raw text.',
    parameters:
      '```json\n{"action":"create_pdf","label":"Rendering your PDF","data":{"title":"Report","content":"# Report","content_format":"markdown"}}\n```\nHTML example:\n```json\n{"action":"create_pdf","label":"Rendering your PDF","data":{"title":"Report","content":"<h1>Report</h1><p>Body text</p>","content_format":"html"}}\n```',
  },
  create_docx: {
    section: 'Documents',
    description:
      'Creates a downloadable Word DOCX file from content. User sees: DOCX download link in chat + document in Studio > Documents. Set content_format to "markdown" (default), "html", or "text" to match your content. Use Markdown tables for structured rows/columns when content_format is "markdown". If content contains HTML tags (<h1>, <p>, <table>, etc.), you MUST set content_format: "html".',
    parameters:
      '```json\n{"action":"create_docx","label":"Rendering your Word document","data":{"title":"Report","content":"# Report\\n\\n| Field | Value |\\n| ----- | ----- |\\n| A | 1 |","content_format":"markdown"}}\n```\nHTML example:\n```json\n{"action":"create_docx","label":"Rendering your Word document","data":{"title":"Report","content":"<h1>Report</h1><p>Body text</p>","content_format":"html"}}\n```',
  },
  list_documents: {
    section: 'Documents',
    description:
      'Lists documents. In a Space chat, this defaults to the active space and returns Space Docs, including Google Drive folders/files synced into the Docs view. The response includes flat documents plus document_index, a nested folder/file tree. Pass parent_item_id to list one folder subtree. Pass search to narrow by title. Campaign-scoped calls also include campaign conversation documents with retrieve_via instructions for get_document.',
    parameters:
      'Active space:\n```json\n{"action":"list_documents","label":"Reviewing your docs","data":{}}\n```\nSearch by title:\n```json\n{"action":"list_documents","label":"Finding your doc","data":{"search":"Hadassah Cyprus"}}\n```\nFolder children:\n```json\n{"action":"list_documents","label":"Opening folder","data":{"space_id":"UUID","parent_item_id":"FOLDER_ITEM_UUID","limit":100}}\n```',
  },
  get_document: {
    section: 'Documents',
    description:
      'Fetches one document by id. With space_id, this reads a Space Doc row from space_items; without space_id, it reads a conversation document and automatically falls back to treating the id as a Space Doc item id. When the document also lives in a space Docs view and that copy is newer (edited in the Docs UI), content returns the space copy and space_item_id/space_id are included — so you always read the latest version. Use document_id from save_document/list_documents. item_id and legacy asset_id are accepted aliases, but document_id is preferred.',
    parameters:
      'Space doc:\n```json\n{"action":"get_document","label":"Loading your document","data":{"space_id":"UUID","document_id":"UUID"}}\n```\nConversation doc:\n```json\n{"action":"get_document","label":"Loading your document","data":{"document_id":"UUID"}}\n```\nLegacy alias:\n```json\n{"action":"get_document","label":"Loading your document","data":{"asset_id":"UUID"}}\n```',
  },
  read_space_document: {
    section: 'Documents',
    description:
      'Reads a Space Doc body by space item id. Native docs return doc_body/notes. Google Drive docs fetch readable Drive export content on demand using _drive_file_id. Folder docs return children plus document_index, a recursive folder/file tree, instead of body text.',
    parameters:
      '```json\n{"action":"read_space_document","label":"Reading this doc","data":{"space_id":"UUID","document_id":"SPACE_ITEM_UUID"}}\n```',
  },
  update_document: {
    section: 'Documents',
    description:
      'Updates a document title, content, or document_type. Accepts EITHER the conversation document_id (from save_document/get_document) OR the Space Doc item id (from list_documents/read_space_document) — the link is resolved automatically and BOTH copies are updated, so the space Docs view stays in sync. If the user edited the doc in the Docs UI more recently than the conversation copy, those edits win unless you pass new content — re-read the document before rewriting content if the user may have edited it manually. Google Drive synced docs cannot be updated here.',
    parameters:
      '```json\n{"action":"update_document","label":"Updating your document","data":{"document_id":"UUID","title":"Updated Title"}}\n```\nSpace Doc item id also works:\n```json\n{"action":"update_document","label":"Updating your document","data":{"document_id":"SPACE_ITEM_UUID","content":{"text":"# Updated body"}}}\n```',
  },
  delete_document: {
    section: 'Documents',
    description:
      'Requests deletion of a document. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_document","label":"Removing your document","data":{"document_id":"UUID"}}\n```',
  },
  create_social_post: {
    section: 'Social',
    description:
      'Creates social post artifact. post_type must be one of: single_image, carousel, text_only, story, reel. Use text_only for LinkedIn text-only posts (no image required). Use single_image / story / reel when the post includes a visual. Optional **video_url** (public HTTPS URL) and **video_asset_id** (media library UUID) attach video — Studio preview plays video; **Instagram and LinkedIn scheduled publishing both support video** (reels, feed video, LinkedIn native video). **image_url** / **image_asset_id** remain for static images. Users can also attach/replace/remove videos directly from the Studio > Social preview (single post and per-carousel-slide), so you do not always need to set media yourself. User sees: post card in Studio > Social with platform preview and media attach controls. Use publish_social_post or schedule_social_post after creation.',
    parameters:
      '```json\n{"action":"create_social_post","label":"Drafting your social post","data":{"platform":"instagram","post_type":"reel","caption":"Hook","video_url":"https://...mp4"}}\n```\nMedia library:\n```json\n{"action":"create_social_post","label":"Drafting your social post","data":{"platform":"instagram","post_type":"reel","video_asset_id":"UUID"}}\n```',
  },
  schedule_social_post: {
    section: 'Social',
    description:
      'Schedules a social post for future publishing. Supported: Instagram (single image, single video/reel, image carousel, mixed image+video carousel) and LinkedIn (single image, single video, text-only, PDF carousel). Non–text-only posts require media (image or video) before scheduling; carousel posts require image_url or video_url on every slide. User sees: post status changes to Scheduled with publish time in Studio > Social. Requires: post created first with create_social_post.',
    parameters:
      '```json\n{"action":"schedule_social_post","label":"Scheduling your post","data":{"social_post_id":"UUID","scheduled_at":"2026-03-20T10:00:00Z"}}\n```',
  },
  update_social_post: {
    section: 'Social',
    description:
      'Updates social post data. Three modes for carousel slides — pick the smallest one that fits your change:\n\n' +
      "1. **carousel_slide_patch** — find-and-replace on one slide's TSX. Use when fixing a style, swapping a label, or changing a few lines. Fastest: you only output the diff, not the full TSX. Saves the user time and your tokens.\n" +
      "2. **carousel_slide_update** — replace one slide's fields (tsx, caption, image_url) while keeping all other slides untouched. Use when you need to rewrite an entire slide from scratch but the rest of the carousel is fine.\n" +
      '3. **carousel_slides** (full array) — replaces every slide. Use only when creating all slides for the first time or restructuring the entire carousel.\n\n' +
      'Default to carousel_slide_patch for edits. Only escalate to carousel_slide_update if the slide needs a full rewrite. Sending carousel_slides when editing one slide will wipe the others.\n\n' +
      '**Video:** set **video_url** and/or **video_asset_id** on the post, or **video_url** / **video_asset_id** on a carousel slide via **carousel_slide_update**. Instagram carousels with any video slide are published as mixed image+video carousels. LinkedIn single-video posts are published as native LinkedIn video. Users can also attach videos directly from the Studio > Social preview without asking you.',
    parameters:
      'Update caption:\n```json\n{"action":"update_social_post","label":"Refining your post","data":{"social_post_id":"UUID","caption":"Updated"}}\n```\n\n' +
      'Attach video:\n```json\n{"action":"update_social_post","label":"Adding reel media","data":{"social_post_id":"UUID","video_url":"https://...mp4"}}\n```\n\n' +
      'Patch slide (fix a style + swap a label — fast, minimal output):\n```json\n{"action":"update_social_post","label":"Fixing slide 2 style","data":{"social_post_id":"UUID","carousel_slide_patch":{"index":1,"replacements":[{"find":"filter: \'saturate(1)\'","replace":"filter: \'saturate(0.4) brightness(0.9)\'"},{"find":"THE ISSUE","replace":"THE PROBLEM"}]}}}\n```\n\n' +
      'Rewrite one slide (other slides stay intact):\n```json\n{"action":"update_social_post","label":"Rebuilding slide 2","data":{"social_post_id":"UUID","carousel_slide_update":{"index":1,"tsx":"<full new tsx>"}}}\n```',
  },
  list_social_posts: {
    section: 'Social',
    description: 'Lists social posts.',
    parameters:
      '```json\n{"action":"list_social_posts","label":"Reviewing social content","data":{}}\n```',
  },
  get_social_post: {
    section: 'Social',
    description: 'Fetches one social post by id.',
    parameters:
      '```json\n{"action":"get_social_post","label":"Loading your social post","data":{"social_post_id":"UUID"}}\n```',
  },
  delete_social_post: {
    section: 'Social',
    description:
      'Requests deletion of a social post. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_social_post","label":"Removing your social post","data":{"social_post_id":"UUID"}}\n```',
  },
  publish_social_post: {
    section: 'Social',
    description:
      'Publishes social post to platform. User sees: post status changes to Published in Studio > Social; post goes live on the platform. Requires: post created first with create_social_post and platform integration connected.',
    parameters:
      '```json\n{"action":"publish_social_post","label":"Publishing your post","data":{"social_post_id":"UUID"}}\n```',
  },
  create_blog_post: {
    section: 'Blog',
    description:
      "Creates blog post for funnel site. User sees: blog post in the funnel's Blog tab, published to the funnel site at /blog. Requires funnel_id — the blog belongs to a specific funnel site.",
    parameters:
      '```json\n{"action":"create_blog_post","label":"Drafting your blog post","data":{"funnel_id":"UUID","title":"Post","slug":"post","content":[]}}\n```',
  },
  update_blog_post: {
    section: 'Blog',
    description: 'Updates blog post.',
    parameters:
      '```json\n{"action":"update_blog_post","label":"Updating your blog post","data":{"blog_post_id":"UUID","title":"Updated"}}\n```',
  },
  list_blog_posts: {
    section: 'Blog',
    description: 'Lists blog posts.',
    parameters:
      '```json\n{"action":"list_blog_posts","label":"Reviewing your blog library","data":{"funnel_id":"UUID"}}\n```',
  },
  get_blog_post: {
    section: 'Blog',
    description: 'Fetches blog post by id.',
    parameters:
      '```json\n{"action":"get_blog_post","label":"Loading your blog post","data":{"blog_post_id":"UUID"}}\n```',
  },
  delete_blog_post: {
    section: 'Blog',
    description:
      'Requests deletion of a blog post. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_blog_post","label":"Removing your blog post","data":{"blog_post_id":"UUID"}}\n```',
  },
  create_mission: {
    section: 'Missions',
    description:
      'Creates a mission. User sees: mission card in Mission Control. When: delegating work to team agents or tracking a multi-step objective. Fields: title (required), brief, description, priority (low/medium/high/urgent), campaign_id, assigned_agent_key, playbook_id, input (arbitrary context object), idempotency_key, parent_mission_id. When the user names a playbook, always pass its id in playbook_id; put playbook-specific kickoff values under input.playbook_kickoff.',
    parameters:
      '```json\n{"action":"create_mission","label":"Creating mission brief","data":{"title":"IG Organic Story Ad","brief":"Render one approved story ad","priority":"medium","campaign_id":"UUID","playbook_id":"ig-organic-video-ad","input":{"playbook_kickoff":{"output_count":1}}}}\n```\n\nMinimal:\n```json\n{"action":"create_mission","label":"Creating mission","data":{"title":"Mission title"}}\n```',
  },
  list_missions: {
    section: 'Missions',
    description:
      "Lists missions visible to you. Results are auto-scoped: employees see missions they are assigned to or worked on; domain managers see their team's missions; cross-domain managers and c-level see all missions. Optional filters: status, campaign_id, limit (default 30).",
    parameters:
      '```json\n{"action":"list_missions","label":"Reviewing my missions","data":{}}\n```\n\nWith filters:\n```json\n{"action":"list_missions","label":"Checking in-progress missions","data":{"status":"in_progress","campaign_id":"UUID","limit":10}}\n```',
  },
  get_mission: {
    section: 'Missions',
    description:
      'Fetches one mission with full context including subtasks and activity logs inline.',
    parameters:
      '```json\n{"action":"get_mission","label":"Loading mission details","data":{"mission_id":"UUID"}}\n```',
  },
  get_mission_plan: {
    section: 'Missions',
    description:
      'Fetches the execution plan for a mission. The plan includes title, summary, approach, and planned subtasks with intent packets.',
    parameters:
      '```json\n{"action":"get_mission_plan","label":"Viewing mission plan","data":{"mission_id":"UUID"}}\n```',
  },
  get_mission_logs: {
    section: 'Missions',
    description:
      'Fetches the activity log for a mission independently. Includes status changes, comments, agent actions, and system events.',
    parameters:
      '```json\n{"action":"get_mission_logs","label":"Checking mission activity","data":{"mission_id":"UUID"}}\n```',
  },
  get_mission_deliverables: {
    section: 'Missions',
    description:
      'Fetches deliverables (work products) for a mission. Use after get_mission to retrieve actual outputs like documents, images, PDFs, or files produced during the mission.',
    parameters:
      '```json\n{"action":"get_mission_deliverables","label":"Loading mission deliverables","data":{"mission_id":"UUID"}}\n```',
  },
  compile_webinar_launch_bible: {
    section: 'Missions',
    description:
      'Creates the final Webinar Launch Bible from a native copy of the ROAS master, preserving its tab order and nested funnel-page tabs while replacing every copied tab body with the supplied campaign-ready HTML. Use only after production approval. Read every approved mission deliverable first. Each tab must contain final structured content with clear headings, native lists, and tables where useful; do not include template instructions, AI prompts, sample copy, empty placeholder sections, or consecutive duplicate lines. The 0 - Overview content must contain client details, important dates, and direct links to the funnel, presentation preview, images/creative, and other native assets. Use parent_title to map P1-P4 beneath 3 - Funnel Pages. Video scripts and overlays must contain no editing timestamps or time ranges. P4 contains only on-page replay landing-page copy. Put replay delivery, post-webinar email/SMS, and replay-plus-offer follow-up in 7 - SMS & Emails. Preserve approved copy verbatim instead of rewriting it.',
    parameters:
      '```json\n{"action":"compile_webinar_launch_bible","label":"Compiling the Webinar Launch Bible","data":{"mission_id":"UUID","title":"Client — Webinar Launch Bible","tabs":[{"title":"0 - Overview","html":"<h1>Overview</h1>"},{"title":"3 - Funnel Pages","html":"<h1>Funnel Pages</h1>"},{"title":"P1 - Opt-in Page","parent_title":"3 - Funnel Pages","html":"<h1>Opt-in Page</h1>"}]}}\n```',
  },
  update_mission: {
    section: 'Missions',
    description:
      'Updates mission fields. Detail fields: title, brief, priority. Status fields: status (inbox/planning/todo/in_progress/review/blocked/done/error/failed/backlog), current_agent_key. Both can be sent in one call.',
    parameters:
      '```json\n{"action":"update_mission","label":"Updating mission status","data":{"mission_id":"UUID","status":"in_progress"}}\n```\n\nUpdate details:\n```json\n{"action":"update_mission","label":"Updating mission brief","data":{"mission_id":"UUID","title":"New title","brief":"Updated brief","priority":"high"}}\n```',
  },
  add_mission_comment: {
    section: 'Missions',
    description:
      'Adds a user comment to the mission log. Triggers a directive phase — the assigned agent will see and respond to the comment.',
    parameters:
      '```json\n{"action":"add_mission_comment","label":"Adding mission note","data":{"mission_id":"UUID","message":"Please focus on the peptide research angle"}}\n```',
  },
  list_mission_subtasks: {
    section: 'Missions',
    description:
      'Lists subtasks for a mission. Each subtask has id, title, status, assigned_agent_key, sort_order, and feedback.',
    parameters:
      '```json\n{"action":"list_mission_subtasks","label":"Checking subtasks","data":{"mission_id":"UUID"}}\n```',
  },
  update_mission_subtask: {
    section: 'Missions',
    description:
      'Updates a subtask within a mission. Fields: status (pending/in_progress/done/revision/blocked/cancelled), assigned_agent_key, feedback (up to 4000 chars).',
    parameters:
      '```json\n{"action":"update_mission_subtask","label":"Updating subtask","data":{"mission_id":"UUID","subtask_id":"UUID","status":"done"}}\n```\n\nWith feedback:\n```json\n{"action":"update_mission_subtask","label":"Requesting revision","data":{"mission_id":"UUID","subtask_id":"UUID","status":"revision","feedback":"Needs more clinical references"}}\n```',
  },
  retry_mission: {
    section: 'Missions',
    description:
      'Retries a mission that is in error or failed status. Resets the mission to inbox and re-triggers planning. Only works when status is error or failed.',
    parameters:
      '```json\n{"action":"retry_mission","label":"Retrying failed mission","data":{"mission_id":"UUID"}}\n```',
  },
  trash_mission: {
    section: 'Missions',
    description:
      'Removes a mission permanently. This deletes the mission row — use with care. Logs a mission.trashed event before deletion.',
    parameters:
      '```json\n{"action":"trash_mission","label":"Removing mission","data":{"mission_id":"UUID"}}\n```',
  },
  answer_mission_question: {
    section: 'Mission Manager',
    description:
      'Vibey-only. Answers a user question about a mission without directly assigning worker agents. Use inside mission activity when the user asks what happened, why something is blocked, or where an output is.',
    parameters:
      '```json\n{"action":"answer_mission_question","label":"Answering mission question","data":{"mission_id":"UUID","question":"Why is this blocked?"}}\n```',
  },
  summarize_mission_state: {
    section: 'Mission Manager',
    description: 'Vibey-only. Summarizes current mission status, subtasks, logs, and progress.',
    parameters:
      '```json\n{"action":"summarize_mission_state","label":"Summarizing mission","data":{"mission_id":"UUID"}}\n```',
  },
  attach_mission_context: {
    section: 'Mission Manager',
    description:
      'Vibey-only. Adds user-provided context to a mission so future planning/execution can use it.',
    parameters:
      '```json\n{"action":"attach_mission_context","label":"Adding mission context","data":{"mission_id":"UUID","message":"Use this transcript as the test input."}}\n```',
  },
  show_mission_deliverable: {
    section: 'Mission Manager',
    description:
      'Vibey-only. Shows one deliverable or lists deliverables for the mission when the user asks for the output.',
    parameters:
      '```json\n{"action":"show_mission_deliverable","label":"Finding mission output","data":{"mission_id":"UUID","deliverable_id":"UUID"}}\n```',
  },
  create_mission_subtask: {
    section: 'Mission Manager',
    description:
      'Vibey-only. Creates a new subtask inside an existing mission. Set publishToTaskList true for concrete build work that should also appear as a linked Space Task.',
    parameters:
      '```json\n{"action":"create_mission_subtask","label":"Creating mission subtask","data":{"mission_id":"UUID","title":"Register the skill","assignTo":"tessa","publishToTaskList":true,"dependsOn":["UUID"],"intent":{"why":"...","story":"...","sensory":"...","endState":"...","ecology":"..."}}}\n```',
  },
  edit_mission_subtask: {
    section: 'Mission Manager',
    description:
      'Vibey-only. Edits a subtask title, assigned agent, dependency list, or intent packet.',
    parameters:
      '```json\n{"action":"edit_mission_subtask","label":"Editing mission subtask","data":{"mission_id":"UUID","subtask_id":"UUID","dependsOn":["UUID"],"assigned_agent_key":"zane"}}\n```',
  },
  cancel_mission_subtask: {
    section: 'Mission Manager',
    description: 'Vibey-only. Cancels a mission subtask and its dependent subtasks.',
    parameters:
      '```json\n{"action":"cancel_mission_subtask","label":"Cancelling subtask","data":{"mission_id":"UUID","subtask_id":"UUID"}}\n```',
  },
  retry_mission_subtask: {
    section: 'Mission Manager',
    description: 'Vibey-only. Retries a mission subtask after feedback, failure, or correction.',
    parameters:
      '```json\n{"action":"retry_mission_subtask","label":"Retrying subtask","data":{"mission_id":"UUID","subtask_id":"UUID"}}\n```',
  },
  reassign_mission_subtask: {
    section: 'Mission Manager',
    description: 'Vibey-only. Reassigns a mission subtask to another agent.',
    parameters:
      '```json\n{"action":"reassign_mission_subtask","label":"Reassigning subtask","data":{"mission_id":"UUID","subtask_id":"UUID","assigned_agent_key":"zane"}}\n```',
  },
  prepare_mission_replan: {
    section: 'Mission Manager',
    description: 'Vibey-only. Cancels incomplete work and sends the mission back through planning.',
    parameters:
      '```json\n{"action":"prepare_mission_replan","label":"Replanning mission","data":{"mission_id":"UUID","reason":"Assigned agent cannot create the required skill."}}\n```',
  },
  approve_mission: {
    section: 'Mission Manager',
    description:
      'Vibey-only. Marks a mission approved/done after verifying the requested work exists.',
    parameters:
      '```json\n{"action":"approve_mission","label":"Approving mission","data":{"mission_id":"UUID","feedback":"Approved."}}\n```',
  },
  save_user_memory: {
    section: 'Brain',
    description:
      "USER DEFAULT BRAIN ONLY — does NOT write to agent brains. For agent brain knowledge, use ingest_agent_brain_text. REQUIRED FIELDS: content (string, minimum 10 characters — this is the knowledge text, NOT called 'memory'), memory_type (must be one of: decision, insight, preference, fact, story, framework, event). Optional: significance (0-1, default 0.7), tags (string array), source_type, source_id, source_title, domain.",
    parameters:
      '```json\n{"action":"save_user_memory","label":"Saving this to your brain","data":{"content":"Users who buy after webinar need 3-day follow-up","memory_type":"insight","significance":0.8,"tags":["webinar","follow-up"]}}\n```',
  },
  atlas_save_brain_context: {
    section: 'Brain',
    description:
      'Atlas Brain router. Saves durable context to the right Brain family when the request explicitly asks to remember, save, or route knowledge. Required: target_brain and content. target_brain can be user, agent, company, or customer. Include agent_key or brain_id for agent brain, contact_id or durable source identity for customer brain, and source metadata when available.',
    parameters:
      'User Brain:\n```json\n{"action":"atlas_save_brain_context","label":"Saving to brain","data":{"target_brain":"user","content":"Weekly launch reviews should include blocker counts.","source_type":"chat","source_title":"Launch review"}}\n```\nAgent Brain:\n```json\n{"action":"atlas_save_brain_context","label":"Saving agent knowledge","data":{"target_brain":"agent","agent_key":"loop","content":"Flow builders should align Space schema before compiling automations.","title":"Flow schema alignment"}}\n```\nCustomer Brain source-anchored:\n```json\n{"action":"atlas_save_brain_context","label":"Saving customer signal","data":{"target_brain":"customer","content":"Visitor asked for clearer onboarding pricing.","source_type":"widget_chat","conversation_id":"UUID","visitor_id":"visitor_123"}}\n```',
  },
  search_user_brain: {
    section: 'Brain',
    description:
      'Searches the selected/default User Brain with hybrid semantic + lexical retrieval. Results are source-grounded and include result id, brain_id, family, kind, title, snippet/content, source_type/source_id/source_title, scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively. For structured curated knowledge, prefer get_brain_pages first.',
    parameters:
      '```json\n{"action":"search_user_brain","label":"Searching your brain","data":{"query":"webinar follow-up strategy for conversions"}}\n```',
  },
  search_brain_context: {
    section: 'Brain',
    description:
      'Explicit cross-Brain search across all accessible Brain families or selected families. Use only when the user asks to search all brains, every brain they can access, shared brains, or multiple named Brain families. For uploaded files, attachments, reports, spreadsheets, PDFs, generated documents, or data the user previously provided in the active work, search or read Space/document sources before Brain because those sources usually have exact retrievable objects. Results are source-grounded and include family/kind/source fields, scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, suggested_next_queries, and by_family counts. For one specific family, use the family-specific search action instead.',
    parameters:
      '```json\n{"action":"search_brain_context","label":"Searching all accessible brains","data":{"query":"pricing decision","families":["user","company"],"limit":10}}\n```',
  },
  search_agent_brain: {
    section: 'Brain',
    description:
      'Searches an Agent Brain with hybrid semantic + lexical retrieval. Requires brain_id from resolve_agent_brain. Results are source-grounded and include scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively. Optional filters: domain, limit. Do not use for campaign/client knowledge brains — use search_campaign_brain.',
    parameters:
      '```json\n{"action":"search_agent_brain","label":"Searching agent brain","data":{"query":"objection handling framework","brain_id":"UUID","domain":"sales","limit":10}}\n```',
  },
  search_campaign_brain: {
    section: 'Campaign',
    description:
      'Searches the campaign brain (ns_memories on the campaign-scoped ns_brains row) for client research, onboarding intake, strategy notes, and ROAS-brain package knowledge. Requires query. Prefer campaign chat scope, or pass campaign_id / campaign_name when the chat is on General or another campaign (cross-scope read allowed). Never target General. Prefer over search_agent_brain / search_user_brain for Impact/client strategy work.',
    parameters:
      '```json\n{"action":"search_campaign_brain","label":"Searching campaign brain","data":{"query":"offer pricing ICP competitors onboarding form","campaign_id":"UUID","limit":15}}\n```\n```json\n{"action":"search_campaign_brain","label":"Searching Impact campaign brain","data":{"query":"onboarding form offer ICP","campaign_name":"Impact","limit":15}}\n```',
  },
  get_brain_stats: {
    section: 'Brain',
    description:
      'Returns stats for a brain scope. Default scope=user counts memories and SK on the user default brain. scope=agent requires agent_id or agent_key (e.g. vibey); if no agent brain row exists, provisioned=false and counts are zero.',
    parameters:
      '```json\n{"action":"get_brain_stats","label":"Checking your brain stats","data":{}}\n```\n```json\n{"action":"get_brain_stats","label":"Agent brain stats","data":{"scope":"agent","agent_id":"vibey"}}\n```',
  },
  resolve_agent_brain: {
    section: 'Brain',
    description:
      'Returns brain_id for an agent brain (ns_brains row for owner + agent_id) and provisioned boolean. Use before ingest_agent_brain_text / ingest_agent_brain_link or search_agent_brain targeting that brain.',
    parameters:
      '```json\n{"action":"resolve_agent_brain","label":"Resolving agent brain","data":{"agent_id":"vibey"}}\n```',
  },
  list_available_brain_scopes: {
    section: 'Brain',
    description:
      'Lists owned brain scopes: default user brain, agent brains, and campaign brains (scope/campaign_id). Also returns current_campaign_brain when the chat is campaign-scoped. For client package knowledge prefer search_campaign_brain with campaign_id — do not invent empty brain ids from campaign names.',
    parameters:
      '```json\n{"action":"list_available_brain_scopes","label":"Listing brain scopes","data":{}}\n```',
  },
  list_user_brain_memories: {
    section: 'Brain',
    description:
      'Lists recent memory entries from the user default brain. Optional limit between 1 and 100.',
    parameters:
      '```json\n{"action":"list_user_brain_memories","label":"Reviewing recent memories","data":{"limit":20}}\n```',
  },
  list_agent_brain_domains: {
    section: 'Brain',
    description:
      'Lists agent brain domain coverage with entry counts per domain. Requires brain_id.',
    parameters:
      '```json\n{"action":"list_agent_brain_domains","label":"Mapping agent brain domains","data":{"brain_id":"UUID"}}\n```',
  },
  get_agent_brain_gaps: {
    section: 'Brain',
    description:
      'Returns explicit agent brain gaps plus thin domains that have low coverage. Requires brain_id.',
    parameters:
      '```json\n{"action":"get_agent_brain_gaps","label":"Analyzing knowledge gaps","data":{"brain_id":"UUID"}}\n```',
  },
  list_agent_brain_imports: {
    section: 'Brain',
    description:
      'Lists import sessions from ns_memory_sessions for an agent brain. Requires brain_id. Optional source filter: all, fathom, or fireflies.',
    parameters:
      '```json\n{"action":"list_agent_brain_imports","label":"Checking recent imports","data":{"brain_id":"UUID","source":"fathom","limit":20}}\n```',
  },
  save_customer_memory: {
    section: 'Brain',
    description:
      'CUSTOMER BRAIN ONLY — saves one customer memory in the current personal/org Customer Brain. Required: content and memory_type. Preferred: contact_id when known. If contact_id is unknown, include durable source identity such as source_id, source_url, conversation_id, visitor_id, meeting_id, telegram_chat_id, source_identity, or customer_source_identity_id. Optional Fathom/source fields: brain_id, source_type, source_title, speaker, metadata, significance, tags. Do not use save_user_memory for customer knowledge.',
    parameters:
      '```json\n{"action":"save_customer_memory","label":"Saving customer memory","data":{"content":"Customer prefers weekly implementation summaries.","memory_type":"preference","contact_id":"UUID","source_type":"fathom_call","source_id":"meeting_123","source_title":"Customer call","speaker":"Maria Lopez","metadata":{"meeting_id":"meeting_123","routing_confidence":0.91,"routing_rationale":"Customer onboarding call"}}}\n```\nContactless source-anchored save:\n```json\n{"action":"save_customer_memory","label":"Saving customer signal","data":{"content":"Anonymous visitor asked for clearer weekly rollout updates.","memory_type":"insight","source_type":"widget_chat","conversation_id":"UUID","visitor_id":"visitor_123","source_title":"Public widget chat"}}\n```',
  },
  search_customer_brain: {
    section: 'Brain',
    description:
      'Searches the current personal/org Customer Brain with hybrid semantic + lexical retrieval. Use for customer cognition, avatar evidence, preferences, objections, and account-specific facts. Results are source-grounded and include scores, match_reasons, evidence_refs, related, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively.',
    parameters:
      '```json\n{"action":"search_customer_brain","label":"Searching customer brain","data":{"query":"onboarding objections","limit":10}}\n```',
  },
  ingest_customer_brain_text: {
    section: 'Brain',
    description:
      'CUSTOMER BRAIN ONLY — saves customer text knowledge. Required: text/content. Preferred: contact_id when known. If contact_id is unknown, include durable source identity such as source_id, source_url, conversation_id, visitor_id, meeting_id, telegram_chat_id, source_identity, or customer_source_identity_id.',
    parameters:
      '```json\n{"action":"ingest_customer_brain_text","label":"Adding customer insight","data":{"text":"The customer asked for clearer weekly rollout updates.","contact_id":"UUID","title":"Weekly updates request"}}\n```\nContactless source-anchored text:\n```json\n{"action":"ingest_customer_brain_text","label":"Adding customer signal","data":{"text":"A public widget visitor asked for clearer weekly rollout updates.","conversation_id":"UUID","visitor_id":"visitor_123","title":"Public widget request"}}\n```',
  },
  ingest_customer_brain_link: {
    section: 'Brain',
    description:
      'CUSTOMER BRAIN ONLY — saves a customer-relevant URL as a source-anchored memory. Required: url. Preferred: contact_id when known.',
    parameters:
      '```json\n{"action":"ingest_customer_brain_link","label":"Adding customer link","data":{"url":"https://example.com/customer-reference","contact_id":"UUID","title":"Customer reference"}}\n```\nContactless link:\n```json\n{"action":"ingest_customer_brain_link","label":"Adding customer link","data":{"url":"https://example.com/customer-reference","title":"Customer reference"}}\n```',
  },
  list_customer_brain_memories: {
    section: 'Brain',
    description:
      'Lists recent memories from the current personal/org Customer Brain. Optional limit between 1 and 100.',
    parameters:
      '```json\n{"action":"list_customer_brain_memories","label":"Reviewing customer memories","data":{"limit":20}}\n```',
  },
  list_customer_avatars: {
    section: 'Brain',
    description:
      'Lists synthesized Customer Brain avatars for the current personal/org Customer Brain.',
    parameters:
      '```json\n{"action":"list_customer_avatars","label":"Reading customer avatars","data":{}}\n```',
  },
  crystallize_user_brain: {
    section: 'Brain',
    description:
      'USER BRAIN ONLY — crystallizes raw thought text into a neural snapshot through the snapshot crystallization pipeline. For agent brains, use the agent brain ingest actions instead.',
    parameters:
      '```json\n{"action":"crystallize_user_brain","label":"Crystallizing this insight","data":{"text":"My best launches happen when offer testing starts before creative production."}}\n```',
  },
  ingest_user_brain_link: {
    section: 'Brain',
    description:
      "USER DEFAULT BRAIN ONLY — does NOT write to agent brains. Ingests a URL through link extraction and memory ingestion into the user's default brain. For agent brain use ingest_agent_brain_link (with brain_id from resolve_agent_brain). Link extraction sets source title from the page when possible; if extraction returns no title, you MUST pass `title` in data. Optional `title` always overrides the extracted title.",
    parameters:
      '```json\n{"action":"ingest_user_brain_link","label":"Ingesting this source","data":{"url":"https://example.com/article","title":"Offer Positioning Notes"}}\n```',
  },
  ingest_user_brain_text: {
    section: 'Brain',
    description:
      "USER DEFAULT BRAIN ONLY — does NOT write to agent brains. Ingests raw text as memory content into the user's default brain. For agent brain use ingest_agent_brain_text (with brain_id from resolve_agent_brain). text/content must be at least 10 chars. **title is REQUIRED** — it becomes source_title and groups memories. Optional memory_type.",
    parameters:
      '```json\n{"action":"ingest_user_brain_text","label":"Ingesting this knowledge","data":{"text":"Customers convert faster when onboarding removes setup friction in first 10 minutes.","memory_type":"fact","title":"Onboarding Conversion Insight"}}\n```',
  },
  transfer_brain_node: {
    section: 'Brain',
    description:
      'Copy or move a brain node (memory, snapshot, sk_entry, sk_source, experience bundle) between supported brain scopes. Campaign/Space context is not a durable Brain target. For experience, pass connected_node_ids. Uses main API internal transfer pipeline.',
    parameters:
      '```json\n{"action":"transfer_brain_node","label":"Moving knowledge to the right brain","data":{"operation":"move","node_type":"memory","node_id":"UUID","source_scope":{"type":"user"},"target_scope":{"type":"agent","agent_id":"vibey"},"connected_node_ids":[]}}\n```',
  },
  transfer_brain_by_source: {
    section: 'Brain',
    description:
      'Batch copy or move ALL memories (and optional snapshots when source_type+source_id match) sharing the same source_title between supported brain scopes. Campaign/Space context is not a durable Brain target. Far more efficient than node-by-node transfer_brain_node for large groups. operation: copy or move. Optional source_type / source_id narrow memory rows; when both are set, matching ns_snapshots are included.',
    parameters:
      '```json\n{"action":"transfer_brain_by_source","label":"Copying source group between brains","data":{"operation":"copy","source_title":"Q4 Playbook","source_type":"document","source_scope":{"type":"user"},"target_scope":{"type":"agent","agent_id":"vibey"}}}\n```',
  },
  assign_user_memory_source: {
    section: 'Brain',
    description:
      'Assign or reassign memories on the USER DEFAULT BRAIN to a source group (updates source_title and optional source_id). Use to fix orphan memories (null/empty source_title) or regroup before transfer_brain_by_source. Provide one of: memory_ids (specific UUIDs), match_source_title (bulk rows with that title), or match_orphan_source_title: true (all null/empty source_title on default brain).',
    parameters:
      '```json\n{"action":"assign_user_memory_source","label":"Grouping orphan memories","data":{"match_orphan_source_title":true,"new_source_title":"Alex Hormozi Master Index"}}\n```\n```json\n{"action":"assign_user_memory_source","label":"Renaming source group","data":{"match_source_title":"Old Bundle Name","new_source_title":"New Bundle Name"}}\n```\n```json\n{"action":"assign_user_memory_source","label":"Tagging specific memories","data":{"memory_ids":["UUID1","UUID2"],"new_source_title":"Source notes","new_source_id":"optional-stable-id"}}\n```',
  },
  delete_brain_node: {
    section: 'Brain',
    description:
      'Deletes a memory, snapshot, SK entry, SK source (and its entries), or a memory connection. Verifies ownership server-side.',
    parameters:
      '```json\n{"action":"delete_brain_node","label":"Removing misplaced memory","data":{"node_type":"memory","node_id":"UUID"}}\n```',
  },
  get_brain_pages: {
    section: 'Brain',
    description:
      'Read structured knowledge pages from a brain library. Broad reads return one summary batch and pagination.next_cursor when more pages exist. Continue by passing cursor=pagination.next_cursor, including after compaction. content_md is omitted by default; pass slug for one page or include_content=true for selected content batches. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains. Before patching, updating, archiving, linking, or unlinking pages, call this first and copy the returned page.id.',
    parameters:
      '```json\n{"action":"get_brain_pages","label":"Reading library pages","data":{"brain_type":"user_default","limit":20}}\n```\n```json\n{"action":"get_brain_pages","label":"Reading one page","data":{"brain_type":"user_default","slug":"brand-voice"}}\n```\n```json\n{"action":"get_brain_pages","label":"Reading next page batch","data":{"brain_type":"agent","brain_id":"UUID","limit":20,"cursor":"pagination.next_cursor from previous result"}}\n```',
  },
  get_brain_timelines: {
    section: 'Brain',
    description:
      'Read Atlas-curated Cortex timelines for a requested brain. Required: brain_type. Use when timeline synthesis needs existing timelines before creating or updating one. Timelines are curated evolution narratives, not raw episode lists.',
    parameters:
      '```json\n{"action":"get_brain_timelines","label":"Reading company timelines","data":{"brain_type":"company","brain_id":"UUID","target_type":"company_object","target_id":"object-uuid"}}\n```',
  },
  get_brain_timeline_items: {
    section: 'Brain',
    description:
      'Read items for a specific Cortex timeline. Required: brain_type and timeline_id. Use before adding or reconciling curated timeline milestones.',
    parameters:
      '```json\n{"action":"get_brain_timeline_items","label":"Reading timeline milestones","data":{"brain_type":"company","brain_id":"UUID","timeline_id":"timeline-uuid","limit":50}}\n```',
  },
  create_brain_timeline: {
    section: 'Brain',
    description:
      'Create a Cortex timeline for a durable brain target. Required: brain_type, timeline_type, target_type, title. Use only for Atlas-owned synthesis when the target has a real evolution arc.',
    parameters:
      '```json\n{"action":"create_brain_timeline","label":"Creating decision timeline","data":{"brain_type":"company","brain_id":"UUID","timeline_type":"company_decision_history","target_type":"company_object","target_id":"object-uuid","title":"Approval Protocol Evolution","summary":"How the company approval protocol formed and changed.","evidence_started_at":"2026-06-01T00:00:00Z","temporal_confidence":0.8,"temporal_source":"company_cortex_formation"}}\n```',
  },
  upsert_brain_timeline_items: {
    section: 'Brain',
    description:
      'Create or update curated timeline milestones. Required: brain_type, timeline_id, items. Use stable dedupe_key values so repeated synthesis updates the same milestone instead of duplicating it.',
    parameters:
      '```json\n{"action":"upsert_brain_timeline_items","label":"Updating timeline milestones","data":{"brain_type":"company","brain_id":"UUID","timeline_id":"timeline-uuid","items":[{"item_type":"decision","title":"Approval-first mutations adopted","description":"The company resolved autonomy vs approval by requiring approval before mutating workspace state.","occurred_at":"2026-06-18T10:00:00Z","temporal_source":"company_cortex_formation","importance":0.8,"confidence":0.82,"dedupe_key":"company_object:object-uuid:approval-first-decision"}]}}\n```',
  },
  archive_brain_timeline: {
    section: 'Brain',
    description:
      'Archive a Cortex timeline when its target has been merged, transformed, or retired. Required: brain_type and id. Do not use to hide ordinary old history.',
    parameters:
      '```json\n{"action":"archive_brain_timeline","label":"Archiving obsolete timeline","data":{"brain_type":"company","brain_id":"UUID","id":"timeline-uuid"}}\n```',
  },
  create_brain_page: {
    section: 'Brain',
    description:
      'Create a new brain library page. Required: brain_type, slug, title, content_md. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.',
    parameters:
      '```json\n{"action":"create_brain_page","label":"Creating brand voice page","data":{"brain_type":"user_default","slug":"brand-voice","title":"Brand Voice & Communication Style","page_type":"topic","content_md":"The brand started casual-first...","summary":"Coach at a conference: warm, authoritative","tags":["brand","voice"],"source_refs":[{"type":"memory","id":"UUID"}]}}\n```',
  },
  patch_brain_page: {
    section: 'Brain',
    description:
      'Edit a specific section of a brain page without rewriting the whole thing. Prefer over update_brain_page. Required: brain_type, id, operation, content. Get id from get_brain_pages first.',
    parameters:
      '```json\n{"action":"patch_brain_page","label":"Adding Q2 insights","data":{"brain_type":"user_default","id":"page-uuid","operation":"append_to_section","section":"The story","content":"After Q2, the user leaned further into the coach persona."}}\n```',
  },
  update_brain_page: {
    section: 'Brain',
    description:
      'Full rewrite of a brain page. Use only for major restructures — prefer patch_brain_page for incremental updates. Required: brain_type and id from get_brain_pages.',
    parameters:
      '```json\n{"action":"update_brain_page","label":"Rewriting brand voice page","data":{"brain_type":"user_default","id":"page-uuid","content_md":"Complete new narrative...","summary":"Updated one-liner"}}\n```',
  },
  archive_brain_page: {
    section: 'Brain',
    description:
      'Mark a brain page as archived. Required: brain_type and id from get_brain_pages. Page is hidden from active queries but data is preserved.',
    parameters:
      '```json\n{"action":"archive_brain_page","label":"Archiving old strategy page","data":{"brain_type":"user_default","id":"page-uuid"}}\n```',
  },
  link_brain_pages: {
    section: 'Brain',
    description:
      'Create a cross-reference link between two brain pages in the same requested brain target. Call get_brain_pages first.',
    parameters:
      '```json\n{"action":"link_brain_pages","label":"Linking pages","data":{"brain_type":"user_default","from_page_id":"UUID","to_page_id":"UUID","link_type":"related"}}\n```',
  },
  unlink_brain_pages: {
    section: 'Brain',
    description:
      'Remove a cross-reference link between two brain pages in the same requested brain target.',
    parameters:
      '```json\n{"action":"unlink_brain_pages","label":"Removing link","data":{"brain_type":"user_default","from_page_id":"UUID","to_page_id":"UUID"}}\n```',
  },
  get_brain_log: {
    section: 'Brain',
    description:
      'Read recent brain evolution log entries. Filter by event_type (create_page, update_page, archive_page, library_sync, detect_pattern, lint_pass). Default limit 10. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.',
    parameters:
      '```json\n{"action":"get_brain_log","label":"Reading recent brain activity","data":{"brain_type":"user_default","limit":10}}\n```\n```json\n{"action":"get_brain_log","label":"Reading agent brain log","data":{"brain_type":"agent","brain_id":"UUID","limit":10}}\n```',
  },
  log_brain_event: {
    section: 'Brain',
    description:
      'Append an entry to the brain evolution log. event_type: create_page, update_page, archive_page, library_sync, detect_pattern, synthesize_perspective, lint_pass, compaction_extract, user_correction. affected_pages is array of page slugs touched. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.',
    parameters:
      '```json\n{"action":"log_brain_event","label":"Logging library sync","data":{"brain_type":"user_default","event_type":"update_page","summary":"Updated brand-voice and marketing-strategy pages with 4 new memories","affected_pages":["brand-voice","marketing-strategy"]}}\n```',
  },
  get_brain_belief_patterns: {
    section: 'Brain',
    description:
      'Read identified belief patterns and recurring themes from a requested brain. Broad reads return one summary batch and pagination.next_cursor when more patterns exist. Continue by passing cursor=pagination.next_cursor, including after compaction. Use include_details=true only for selected detail batches. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.',
    parameters:
      '```json\n{"action":"get_brain_belief_patterns","label":"Reading belief patterns","data":{"brain_type":"user_default","limit":20}}\n```\n```json\n{"action":"get_brain_belief_patterns","label":"Reading next belief batch","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"cursor":"pagination.next_cursor from previous result"}}\n```\n```json\n{"action":"get_brain_belief_patterns","label":"Reading belief details","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"include_details":true}}\n```',
  },
  create_brain_belief_pattern: {
    section: 'Brain',
    description:
      'Create a new belief pattern in the requested brain. Required: brain_type, pattern_name, description. Pass brain_id for agent, customer, or company brains.',
    parameters:
      '```json\n{"action":"create_brain_belief_pattern","label":"Recording new belief pattern","data":{"brain_type":"customer","brain_id":"UUID","pattern_name":"resistance to scaling","description":"Repeated concern about growing too fast without infrastructure","supporting_memories":["uuid-1","uuid-2","uuid-3"],"strength":0.5}}\n```',
  },
  update_brain_belief_pattern: {
    section: 'Brain',
    description:
      'Update any field on a belief pattern: pattern_name, description, strength, status, emotional_signature.',
    parameters:
      '```json\n{"action":"update_brain_belief_pattern","label":"Updating belief strength","data":{"brain_type":"user_default","id":"UUID","strength":0.8,"status":"active"}}\n```',
  },
  archive_brain_belief_pattern: {
    section: 'Brain',
    description:
      'Set a belief pattern to resolved status. Use when a belief has been overcome or is no longer relevant.',
    parameters:
      '```json\n{"action":"archive_brain_belief_pattern","label":"Archiving resolved belief","data":{"brain_type":"user_default","id":"UUID"}}\n```',
  },
  merge_brain_belief_patterns: {
    section: 'Brain',
    description:
      'Merge two belief patterns. Supporting memories are combined into primary. Secondary is archived. Optional description overrides the merged description.',
    parameters:
      '```json\n{"action":"merge_brain_belief_patterns","label":"Merging overlapping beliefs","data":{"brain_type":"user_default","primary_id":"UUID","secondary_id":"UUID","description":"Combined belief description"}}\n```',
  },
  connect_brain_belief_to_memory: {
    section: 'Brain',
    description:
      "Add a memory ID to a belief pattern's supporting_memories array. Reinforces the belief.",
    parameters:
      '```json\n{"action":"connect_brain_belief_to_memory","label":"Adding evidence to belief","data":{"brain_type":"user_default","belief_id":"UUID","memory_id":"UUID"}}\n```',
  },
  disconnect_brain_belief_from_memory: {
    section: 'Brain',
    description: "Remove a memory ID from a belief pattern's supporting_memories array.",
    parameters:
      '```json\n{"action":"disconnect_brain_belief_from_memory","label":"Removing evidence from belief","data":{"brain_type":"user_default","belief_id":"UUID","memory_id":"UUID"}}\n```',
  },
  get_brain_perspectives: {
    section: 'Brain',
    description:
      'Read synthesized perspectives from the requested brain. Broad reads return one summary batch and pagination.next_cursor when more perspectives exist. Continue by passing cursor=pagination.next_cursor, including after compaction. Long narrative fields are omitted by default; use include_details=true only for selected detail batches. Required: brain_type. Use brain_type=user_default for the default User Brain; pass brain_id for agent, customer, or company brains.',
    parameters:
      '```json\n{"action":"get_brain_perspectives","label":"Reading perspectives","data":{"brain_type":"user_default","limit":20}}\n```\n```json\n{"action":"get_brain_perspectives","label":"Reading next perspective batch","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"cursor":"pagination.next_cursor from previous result"}}\n```\n```json\n{"action":"get_brain_perspectives","label":"Reading perspective details","data":{"brain_type":"customer","brain_id":"UUID","status":"active","limit":20,"include_details":true}}\n```',
  },
  create_brain_perspective: {
    section: 'Brain',
    description:
      'Create a new perspective in the requested brain. Required: brain_type, name, description. Pass brain_id for agent, customer, or company brains.',
    parameters:
      '```json\n{"action":"create_brain_perspective","label":"Creating new perspective","data":{"brain_type":"customer","brain_id":"UUID","name":"Growth-at-all-costs mindset","description":"Believes rapid scaling is the only viable path","narrative_md":"This perspective emerged from...","beliefs":["belief-uuid-1","belief-uuid-2","belief-uuid-3"],"strength":0.6}}\n```',
  },
  update_brain_perspective: {
    section: 'Brain',
    description:
      'Update any field on a perspective: name, description, narrative_md, strength, status, blind_spots.',
    parameters:
      '```json\n{"action":"update_brain_perspective","label":"Updating perspective narrative","data":{"brain_type":"user_default","id":"UUID","narrative_md":"Updated narrative...","strength":0.7}}\n```',
  },
  archive_brain_perspective: {
    section: 'Brain',
    description:
      'Set a perspective to transformed status. Use when a worldview has fundamentally shifted.',
    parameters:
      '```json\n{"action":"archive_brain_perspective","label":"Archiving transformed perspective","data":{"brain_type":"user_default","id":"UUID"}}\n```',
  },
  connect_brain_belief_to_perspective: {
    section: 'Brain',
    description: "Add a belief ID to a perspective's beliefs array.",
    parameters:
      '```json\n{"action":"connect_brain_belief_to_perspective","label":"Connecting belief to perspective","data":{"brain_type":"user_default","perspective_id":"UUID","belief_id":"UUID"}}\n```',
  },
  disconnect_brain_belief_from_perspective: {
    section: 'Brain',
    description: "Remove a belief ID from a perspective's beliefs array.",
    parameters:
      '```json\n{"action":"disconnect_brain_belief_from_perspective","label":"Disconnecting belief from perspective","data":{"brain_type":"user_default","perspective_id":"UUID","belief_id":"UUID"}}\n```',
  },
  get_brain_lint: {
    section: 'Brain',
    description:
      'Read brain lint results (health check findings). Default returns unresolved only. Filter by check_type (contradiction, stale, orphan, gap, shallow, missing_link), severity (info, warning, critical), or resolved (true to include resolved).',
    parameters:
      '```json\n{"action":"get_brain_lint","label":"Reading brain health findings","data":{}}\n```\n```json\n{"action":"get_brain_lint","label":"Reading contradictions","data":{"check_type":"contradiction"}}\n```',
  },
  run_brain_lint: {
    section: 'Brain',
    description:
      'Trigger an on-demand brain lint (health check). Enqueues a brain_lint job that Atlas will execute. Returns immediately with confirmation.',
    parameters:
      '```json\n{"action":"run_brain_lint","label":"Running brain health check","data":{}}\n```',
  },
  resolve_brain_lint: {
    section: 'Brain',
    description:
      'Mark a lint result as resolved. Use after fixing the issue (created missing page, updated stale page, added link, etc.).',
    parameters:
      '```json\n{"action":"resolve_brain_lint","label":"Resolving lint finding","data":{"id":"UUID"}}\n```',
  },
  get_company_brain_objects: {
    section: 'Brain',
    description:
      'List durable Company Cortex objects for the org company brain. Filter by object_type and status. Omit brain_id to use the org default company brain.',
    parameters:
      '```json\n{"action":"get_company_brain_objects","label":"Reading company brain","data":{"object_type":"belief","status":"active","limit":20}}\n```',
  },
  get_company_brain_object_edges: {
    section: 'Brain',
    description:
      'List typed relationships between company cortex objects (supports, contradicts, contains, enforces, derived_from, refines).',
    parameters:
      '```json\n{"action":"get_company_brain_object_edges","label":"Reading company brain edges","data":{"source_object_id":"UUID"}}\n```',
  },
  search_company_brain: {
    section: 'Brain',
    description:
      'Search Company Brain with hybrid semantic + lexical retrieval over company cortex objects and related edges. Use when you need operating beliefs, standards, tensions, protocols, decisions, or org guidance. Results are source-grounded and include scores, match_reasons, evidence_refs, related company objects, metadata, context_sufficient, missing, and suggested_next_queries. If context_sufficient=false, search again with suggested_next_queries or ask the user instead of answering definitively.',
    parameters:
      '```json\n{"action":"search_company_brain","label":"Searching company brain","data":{"query":"approval before publish","limit":10}}\n```',
  },
  propose_company_brain_signal: {
    section: 'Brain',
    description:
      'Propose Company Brain knowledge for human review. Raw company saves create proposed signals only; durable Company Cortex objects are created later from reviewed signals by formation.',
    parameters:
      '```json\n{"action":"propose_company_brain_signal","label":"Proposing company signal","data":{"signal_type":"standard","truth":"Agents should ask before publishing customer-facing changes.","evidence_refs":[{"type":"conversation","id":"UUID"}],"confidence":0.72,"context_form":"Use this when deciding whether to publish externally."}}\n```',
  },
  create_company_brain_object: {
    section: 'Brain',
    description:
      'Create a durable company cortex object on the org company brain from reviewed signal lineage only. Atlas formation/internal write. Requires source_signal_ids, evidence_refs, and retrieval_rule.trigger plus retrieval_rule.context_form.',
    parameters:
      '```json\n{"action":"create_company_brain_object","label":"Creating company belief","data":{"object_type":"belief","title":"Ask before workspace mutations","truth":"Agents must ask before creating or changing workspace objects.","status":"active","confidence":0.82,"source_signal_ids":["UUID"],"evidence_refs":[{"type":"company_signal","id":"UUID"}],"retrieval_rule":{"trigger":"workspace mutation","context_form":"Ask before creating or changing workspace objects."}}}\n```',
  },
  update_company_brain_object: {
    section: 'Brain',
    description:
      'Update fields on an existing company cortex object (title, truth, status, confidence, retrieval_rule).',
    parameters:
      '```json\n{"action":"update_company_brain_object","label":"Updating company standard","data":{"id":"UUID","confidence":0.9}}\n```',
  },
  archive_company_brain_object: {
    section: 'Brain',
    description: 'Retire a company cortex object by setting status to retired.',
    parameters:
      '```json\n{"action":"archive_company_brain_object","label":"Archiving company object","data":{"id":"UUID"}}\n```',
  },
  create_company_brain_edge: {
    section: 'Brain',
    description:
      'Create a typed edge between two company cortex objects. relation_type: supports, contradicts, contains, enforces, derived_from, refines.',
    parameters:
      '```json\n{"action":"create_company_brain_edge","label":"Linking company objects","data":{"source_object_id":"UUID","target_object_id":"UUID","relation_type":"contains","confidence":0.85}}\n```',
  },
  delete_company_brain_edge: {
    section: 'Brain',
    description:
      'Delete a company cortex object edge by id when reconciling tensions or restructuring relations.',
    parameters:
      '```json\n{"action":"delete_company_brain_edge","label":"Removing company edge","data":{"id":"UUID"}}\n```',
  },
  create_strategy_node: {
    section: 'Strategy',
    description:
      'Creates a strategy note on the campaign workflow canvas. Used for visual planning and brainstorming. node_type: sticky_note, text_block, group_box, or milestone. color: yellow, blue, green, purple, pink, or orange. artifact_hint: optional hint for what artifact type this note might become (e.g. funnel, sequence, offer).',
    parameters:
      '```json\n{"action":"create_strategy_node","label":"Adding strategy note","data":{"node_type":"sticky_note","text":"Presentation: Free PDF guide on 5 email mistakes","color":"yellow","artifact_hint":"presentation","position_x":200,"position_y":300}}\n```',
  },
  list_strategy_nodes: {
    section: 'Strategy',
    description: 'Lists all strategy notes on the campaign workflow canvas.',
    parameters:
      '```json\n{"action":"list_strategy_nodes","label":"Checking strategy notes","data":{}}\n```',
  },
  get_canvas_board: {
    section: 'Canvas',
    description:
      'Loads the current campaign Canvas revision, editable items, and connectors. Call this immediately before applying Canvas operations.',
    parameters:
      '```json\n{"action":"get_canvas_board","label":"Reading the campaign canvas","data":{}}\n```',
  },
  apply_canvas_operations: {
    section: 'Canvas',
    description:
      'Creates or edits normalized, editable objects on the campaign Canvas. Use the revision returned by get_canvas_board. Items support sticky_note, text, shape, frame, card, and resource_card; connectors reference item UUIDs.',
    parameters:
      '```json\n{"action":"apply_canvas_operations","label":"Building the campaign canvas","data":{"base_revision":0,"operations":[{"op":"create_item","item":{"id":"UUID","kind":"sticky_note","position_x":120,"position_y":160,"content":{"title":"Awareness","text":"Lead magnet traffic"}}}]}}\n```',
  },
  list_custom_fields: {
    section: 'Offers',
    description: 'Lists custom fields for merge tags and personalization.',
    parameters:
      '```json\n{"action":"list_custom_fields","label":"Loading custom fields","data":{}}\n```',
  },
  set_website_layout: {
    section: 'Website',
    description:
      'Sets shared website layout (nav/footer) for a multi-page website. Call AFTER create_website and BEFORE adding pages. The renderer wraps every page with this layout automatically — pages do NOT need inline header/footer. For HTML bundle websites, pass nav_html/footer_html (plain HTML fragments saved as shared/nav.html and shared/footer.html). The JSON navigation/footer data provides structural info (links, logo). layout.navigation.items[].path must exactly match page paths.',
    parameters:
      '```json\n{"action":"set_website_layout","label":"Setting up site navigation","data":{"funnel_id":"UUID","layout":{"navigation":{"logo":{"url":"https://...","alt":"Brand Name"},"items":[{"label":"Home","path":"/"},{"label":"About","path":"/about"},{"label":"Services","path":"/services"},{"label":"Contact","path":"/contact","style":"button"}],"position":"sticky","style":"blur"},"footer":{"columns":[{"title":"Company","links":[{"label":"About","path":"/about"},{"label":"Services","path":"/services"}]},{"title":"Connect","links":[{"label":"Contact","path":"/contact"},{"label":"LinkedIn","path":"https://linkedin.com/company/..."}]}],"copyright":"© 2026 Brand Name. All rights reserved.","socials":[{"platform":"LinkedIn","url":"https://linkedin.com/company/..."}]},"navigation_tsx":"const Nav = () => { ... };\\nexport default Nav","footer_tsx":"const Footer = () => { ... };\\nexport default Footer"}}}\n```',
  },
  prepare_email_send: {
    section: 'Sequences',
    description:
      'Prepares a single broadcast email for user approval. User sees: email_send_confirm approval card in chat — email is NOT sent until user clicks approve. Returns an email_send_confirm UI block.',
    parameters:
      '```json\n{"action":"prepare_email_send","label":"Preparing your broadcast","data":{"sequence_email_id":"UUID"}}\n```',
  },
  prepare_sequence_send: {
    section: 'Sequences',
    description:
      'Prepares a full sequence schedule for user approval. User sees: email_send_confirm approval card in chat with full schedule — sequence is NOT activated until user approves.',
    parameters:
      '```json\n{"action":"prepare_sequence_send","label":"Preparing your sequence send","data":{"sequence_id":"UUID"}}\n```',
  },
  list_agent_skills: {
    section: 'Team',
    description:
      'Lists skills for an agent. agent_key is optional when managing the current agent because the backend resolves it from the session; pass agent_key only when explicitly targeting another agent.',
    parameters:
      '```json\n{"action":"list_agent_skills","label":"Reviewing agent skills","data":{"agent_key":"copywriter"}}\n```',
  },
  create_agent_skill: {
    section: 'Team',
    description:
      "Creates a custom skill for an agent. User sees: skill in the agent's skill list in Team. When: user wants to teach an agent a new capability or workflow. agent_key is optional for the current agent and resolved from session when omitted.",
    parameters:
      '```json\n{"action":"create_agent_skill","label":"Adding agent skill","data":{"agent_key":"copywriter","skill_key":"my_skill","name":"Title","description":"...","markdown_content":"..."}}\n```',
  },
  update_agent_skill: {
    section: 'Team',
    description:
      'Updates an existing agent skill. agent_key is optional for the current agent and resolved from session when omitted. Accepts: skill_key, name, description, markdown_content, is_enabled. Required for user-facing history: include change_summary (past-tense, behavior-focused, max 120 chars; never mention file names). For reference files, use create_agent_skill_resource instead.',
    parameters:
      '```json\n{"action":"update_agent_skill","label":"Updating agent skill","data":{"agent_key":"copywriter","skill_id":"UUID","name":"New Title","description":"Updated description","markdown_content":"Updated body","is_enabled":true,"change_summary":"Sharpened their copy-review process"}}\n```',
  },
  delete_agent_skill: {
    section: 'Team',
    description:
      'Deletes an agent skill by skill_id. agent_key is optional for the current agent and resolved from session when omitted.',
    parameters:
      '```json\n{"action":"delete_agent_skill","label":"Removing agent skill","data":{"agent_key":"copywriter","skill_id":"UUID"}}\n```',
  },
  create_agent_skill_resource: {
    section: 'Team',
    description:
      'Adds or replaces a reference file for an agent skill. agent_key is optional for the current agent and resolved from session when omitted. Reference files are supporting material (design systems, templates, code samples) stored separately from the skill body.',
    parameters:
      '```json\n{"action":"create_agent_skill_resource","label":"Adding skill reference file","data":{"agent_key":"copywriter","skill_key":"my_skill","file_path":"references/design-system.md","content":"# Reference content"}}\n```',
  },
  update_agent_skill_resource: {
    section: 'Team',
    description:
      'Updates the content of an existing reference file for an agent skill. agent_key is optional for the current agent and resolved from session when omitted. Same as create_agent_skill_resource (upserts by file_path).',
    parameters:
      '```json\n{"action":"update_agent_skill_resource","label":"Updating skill reference","data":{"agent_key":"copywriter","skill_key":"my_skill","file_path":"references/design-system.md","content":"# Updated content"}}\n```',
  },
  delete_agent_skill_resource: {
    section: 'Team',
    description:
      'Requests deletion of a reference file from an agent skill. agent_key is optional for the current agent and resolved from session when omitted. Returns a confirmation card the user must approve.',
    parameters:
      '```json\n{"action":"delete_agent_skill_resource","label":"Removing skill reference","data":{"agent_key":"copywriter","skill_key":"my_skill","file_path":"references/design-system.md"}}\n```',
  },
  copy_skill_resource: {
    section: 'Team',
    description:
      'Copies a reference file from one agent skill to another. Reads the source resource and writes it to the target skill. Use for sharing templates or reference material between agents.',
    parameters:
      '```json\n{"action":"copy_skill_resource","label":"Copying skill reference","data":{"source_agent_key":"vibey","source_skill_key":"funnel-builder","file_path":"references/tsx-template.md","target_agent_key":"ivy","target_skill_key":"landing-page-copy"}}\n```',
  },
  upload_skill_asset: {
    section: 'Team',
    description:
      'Uploads an image or file to an agent skill as a reference asset. Downloads from the provided image_url or normalized asset_ref, stores in Supabase storage, and attaches to the skill as a visual reference. When: user wants to add a reference image, brand asset, mockup, or visual example to a skill.',
    parameters:
      '```json\n{"action":"upload_skill_asset","label":"Adding image to skill","data":{"agent_key":"copywriter","skill_key":"seo-writing","asset_ref":{"kind":"external_asset","url":"https://example.com/brand-palette.png"},"image_url":"https://example.com/brand-palette.png","description":"Brand color palette reference"}}\n```',
  },
  patch_state: {
    section: 'State',
    description: 'Patches persisted agent/campaign working state (structured delta).',
    parameters:
      '```json\n{"action":"patch_state","label":"Updating working state","data":{"patches":[]}}\n```',
  },
  get_media_generation_status: {
    section: 'Media',
    description: 'Reads status of in-flight media generation jobs for the campaign.',
    parameters:
      '```json\n{"action":"get_media_generation_status","label":"Checking media jobs","data":{}}\n```',
  },
  generate_image: {
    section: 'Media',
    description:
      'Generate a new image from a text prompt, OR edit/modify an existing image by providing asset_ref/asset_refs or input_image_url(s) alongside a prompt describing the desired changes. Supports: text-to-image generation, image editing (change specific elements, add/remove objects, modify text on images, inpainting), and multi-image composition (up to 14 input images). When editing, describe what to change and what to keep. Can attach to an ad for campaign media with ad_id, attach directly to an avatar portrait with avatar_id, or patch an Ad Creative Canvas node with canvas_node_id. When the user is in a Space (or asks for Space Media), ALWAYS pass space_id (and campaign_id when known) in data. On success the tool returns image_asset_id, asset_ref, space_id, and media_library="registered_in_space_media" — that IS registration in the Space Media library. Never tell the user that generate_image only returns a URL or cannot register Space Media. If success is false, report the error; do not invent a platform limitation. User sees: generated image in chat + that Space\'s Media tab. When avatar_id is provided the backend also sets persona_data.avatar_image on that avatar. When attaching to ad, follow up with update_ad to set image_url on the ad. Image models (not chat models): default openai/gpt-5.4-image-2 aka "ChatGPT" / "GPT Image 2" (OpenAI image model — GPT-5.6 is a chat model and is NOT an image-generation model id); google/gemini-3.1-flash-image aka "Nano Banana 2" (fast edits / multi-image). When the user says "Nano Banana", use google/gemini-3.1-flash-image. When they say ChatGPT / GPT Image / Image 2, use openai/gpt-5.4-image-2. Do not pass gpt-5.6 as the image model. Branding gate: before branded creatives, read ACTIVE_THEME / BRANDING_GATE from campaign context. If Theme is none, ask whether branding exists for this company/campaign (or offer to pull/create a Theme) and wait — do not invent brand colors, logos, or style. If a Theme is present, confirm it is the branding to use on the first branded visual in the conversation, then apply logo/headshots/product images/image_style_prompt/colors on every subsequent generation.',
    parameters:
      '```json\n{"action":"generate_image","label":"Creating avatar portrait","data":{"prompt":"Create a polished buyer persona portrait based on this avatar profile.","model":"openai/gpt-5.4-image-2","space_id":"UUID — required for Space Media library","campaign_id":"UUID optional","asset_ref":{"kind":"external_asset","url":"https://... optional single image to edit"},"asset_refs":[{"kind":"external_asset","url":"https://... optional multi-image reference"}],"input_image_url":"https://... (single image to edit)","input_image_urls":["https://...","https://... (optional, up to 14 images for multi-image composition)"],"aspect_ratio":"1:1","avatar_id":"UUID optional — sets avatar portrait","ad_id":"UUID optional","canvas_node_id":"UUID optional — patches Ad Creative Canvas node"}}\n```',
  },
  edit_image: {
    section: 'Media',
    description:
      'Image-to-image edit using asset_ref, a parent image asset id, or a parent image URL. Prefer asset_ref when the image came from upload or an integration. Pass canvas_node_id when invoked from the Ad Creative Canvas so the node is patched directly.',
    parameters:
      '```json\n{"action":"edit_image","label":"Editing image","data":{"prompt":"Make the headline larger and shift background to deep navy","asset_ref":{"kind":"vibey_asset","asset_id":"UUID"},"parent_image_asset_id":"UUID","parent_image_url":"https://... optional if asset id provided","model":"gemini-3.1-flash-image-preview","aspect_ratio":"1:1","canvas_node_id":"UUID optional"}}\n```',
  },
  list_canvas_nodes: {
    section: 'Ads',
    description:
      'Read-only list of nodes on an Ad Creative Canvas. Use in Canvas Operator mode to see sibling creatives before generating the next node. Provide canvas_id or ad_set_id.',
    parameters:
      '```json\n{"action":"list_canvas_nodes","label":"Reading canvas","data":{"ad_set_id":"UUID"}}\n```',
  },
  generate_ad_set: {
    section: 'Ads',
    description:
      'Fans out image generations across selected ad strategies and creates ads in an ad set. Uses the shared 10-strategy library (visual_contrast, founder_authority, etc.). Each strategy × variations_per_strategy becomes one ad with image_url + metadata.creative_strategy.',
    parameters:
      '```json\n{"action":"generate_ad_set","label":"Generating ad set","data":{"ad_set_id":"UUID","strategies":["visual_contrast","bold_offer"],"variations_per_strategy":2,"model":"gemini-3.1-flash-image-preview"}}\n```',
  },
  generate_video: {
    section: 'Media',
    description:
      'Starts video generation. Async — after calling, use the wait tool (wait 30s) then poll with get_video_status. Repeat: wait(30) -> get_video_status until status is succeeded or failed. Max ~5 polls (~2.5 min). If still processing after that, inform the user. Available models: veo-3.1-fast (default, general text/image-to-video), seedance-2 (ByteDance Seedance 2.0 on Replicate — multimodal refs, synced audio; requires integer duration 1–15; use reference_video_urls for motion/style — higher per-second credits than text-only), kling-v3 (cinematic + audio/lip-sync, multi-shot), grok-imagine-video (general, video editing), gen-4.5 (premium cinematic), fabric-1.0 (talking head from image + audio, no prompt needed). Pass model in data to select. fabric-1.0 requires image_url + audio_url instead of prompt. seedance-2: do not combine reference_image_urls with image_url/last_frame_url; last_frame_url requires image_url.',
    parameters:
      '```json\n{"action":"generate_video","label":"Generating your video","data":{"prompt":"...","model":"seedance-2","duration":7,"aspect_ratio":"16:9","resolution":"720p","image_url":"optional first frame","last_frame_url":"optional last frame (requires image_url)","reference_image_urls":["https://..."],"reference_video_urls":["https://..."],"reference_audio_urls":["https://..."],"generate_audio":true,"seed":99}}\n```',
  },
  get_video_status: {
    section: 'Media',
    description:
      'Polls video generation job status. **job_id is REQUIRED**. Call after wait(30) following generate_video. Returns status: starting, processing, succeeded, or failed. If still processing, call wait(30) and poll again. When succeeded, returns the video URL.',
    parameters:
      '```json\n{"action":"get_video_status","label":"Checking video status","data":{"job_id":"..."}}\n```',
  },
  analyze_video: {
    section: 'Media',
    description:
      'Analyzes a video asset for creative workflows. Accepts media_url or asset_ref with a URL. Set extract_frames: true and transcribe: false for visual-only QA; frame extraction does not require Deepgram. Enable transcribe only when a spoken-audio transcript is needed. Use transcribe_audio for audio-only files.',
    parameters:
      '```json\n{"action":"analyze_video","label":"Checking final video frames","data":{"media_url":"https://...","extract_frames":true,"transcribe":false,"frame_count":12}}\n```',
  },
  transcribe_audio: {
    section: 'Media',
    description:
      'Transcribes an uploaded or externally hosted audio file using Vibey-managed Deepgram Nova-3. Use the original audio URL for WhatsApp OGG/Opus voice notes, MP3, M4A, WAV, and audio-only files; do not convert to MP4 just to transcribe. Accepts media_url, audio_url, file_url, url, video_url, or asset_ref with a URL. If the user or surrounding context explicitly identifies the spoken language, pass it with language using the provider language code; clear language hints improve transcripts for multilingual audio and avoid relying on auto-detection.',
    parameters:
      'Known language:\n```json\n{"action":"transcribe_audio","label":"Transcribing audio","data":{"media_url":"https://.../voice.ogg","language":"<provider-language-code>"}}\n```\nUnknown language:\n```json\n{"action":"transcribe_audio","label":"Transcribing audio","data":{"media_url":"https://.../voice.ogg"}}\n```',
  },
  analyze_image: {
    section: 'Media',
    description:
      'Analyzes one or more images using Vibey-managed vision. Use for Google Drive folder photos, uploaded thumbnails, campaign media, carousel selection, quality scoring, text-in-image checks, and brand fit. Accepts asset_ref/asset_refs, public image URLs, or media asset ids. Never ask the user for an API key or token for image analysis.',
    parameters:
      '```json\n{"action":"analyze_image","label":"Analyzing photos","data":{"asset_refs":[{"kind":"vibey_asset","asset_id":"UUID"},{"kind":"external_asset","url":"https://..."}],"image_urls":["https://...","https://..."],"asset_ids":["UUID optional"],"prompt":"Rank these for an Instagram carousel. Return visual summary, text, quality, brand fit, risks, and carousel_score."}}\n```',
  },
  extract_url_transcript: {
    section: 'Media',
    description: 'Extracts transcript text from a public video URL when supported.',
    parameters:
      '```json\n{"action":"extract_url_transcript","label":"Pulling transcript","data":{"url":"https://..."}}\n```',
  },
  read_document: {
    section: 'Media',
    description:
      'Reads an uploaded asset by media `asset_id` or `asset_ref` with page-aware support for PDFs and native image/document references. Use mode=describe first, then mode=read with page_range for large files. Supports mode=search for simple query matching in indexed text.',
    parameters:
      '```json\n{"action":"read_document","label":"Reading your document","data":{"asset_ref":{"kind":"vibey_asset","asset_id":"UUID"},"asset_id":"UUID","mode":"read","page_range":[1,5],"max_pages":20,"query":"optional","model_id":"optional current model id"}}\n```',
  },
  process_media: {
    section: 'Media',
    description:
      'Processes media files server-side, renders deterministic static-ad-book and Validate Messaging images, and composites exact IG Story sticker videos. Use render_static_ad with one approved static-ad-book template, a 4:5 or 9:16 ratio, and its exact flat spec; the server produces one copy-safe PNG and registers a mission Deliverable. Use render_validate_messaging with 1-8 identity-callout lines and verified Theme colors. Use render_ig_story for approved sticker copy; the server applies the fixed 1080x1920, 10-second H.264/AAC contract. Structural, audio, visual, playback, compositing, and analysis operations use ffmpeg. Output is uploaded to campaign media.',
    parameters:
      'Static ad:\n```json\n{"action":"process_media","label":"Rendering exact static ad","data":{"operation":"render_static_ad","template_id":"myth_vs_system","aspect_ratio":"4:5","spec":{"HEADLINE_HTML":"YOUR EXACT COPY","CTA":"BUILD FASTER"}}}\n```\nIG Story:\n```json\n{"action":"process_media","label":"Rendering IG Story video","data":{"operation":"render_ig_story","url":"https://.../clean-source.mp4","pill_line":"Free Training","headline_lines":[{"text":"Build launch-ready ads"},{"text":"without the production drag","highlighted":true}],"cta_line":"Tap Below To Build Faster","emoji":"⏰"}}\n```\nValidate Messaging:\n```json\n{"action":"process_media","label":"Rendering Validate Messaging statics","data":{"operation":"render_validate_messaging","brand_color":"#FFEA00","lines":[{"text":"If you are a top-producing lender, your income should not have a ceiling.","highlight":"top-producing lender","stamp":"Free live training · July 22 · 10am PT"}]}}\n```\nFor other operations, use describe_action to load the current operation-specific contract.',
  },
  list_mcp_servers: {
    section: 'MCP',
    description:
      'Lists MCP servers connected to this workspace. Use first when the user asks what MCP tools are available or before calling an MCP tool. Returns id, name, server_url, domain, enabled flags, tool_count, and last_connected_at. No input is required.',
    parameters:
      '```json\n{"action":"list_mcp_servers","label":"Checking connected MCP servers","data":{}}\n```',
  },
  list_mcp_tools: {
    section: 'MCP',
    description:
      'Lists live tools exposed by one connected MCP server. Required: either server_name or server_id. Use this before use_mcp_tool so you can copy the exact tool_name and input schema. The server must be enabled and accessible for your agent domain.',
    parameters:
      'By server name:\n```json\n{"action":"list_mcp_tools","label":"Checking Zuops tools","data":{"server_name":"zuops"}}\n```\n\nBy server id:\n```json\n{"action":"list_mcp_tools","label":"Checking MCP tools","data":{"server_id":"UUID"}}\n```',
  },
  use_mcp_tool: {
    section: 'MCP',
    description:
      'Calls a tool on a connected MCP server. Required: either server_name or server_id, plus tool_name. Put the MCP tool payload inside arguments. Run list_mcp_tools first and follow that tool inputSchema exactly. Aliases accepted: tool -> tool_name, args -> arguments. The server must be enabled, agent_enabled, and accessible for your agent domain.',
    parameters:
      'No-argument tool:\n```json\n{"action":"use_mcp_tool","label":"Checking Zuops credits","data":{"server_name":"zuops","tool_name":"check_credits","arguments":{}}}\n```\n\nTool with arguments:\n```json\n{"action":"use_mcp_tool","label":"Generating image with Zuops","data":{"server_name":"zuops","tool_name":"generate_image","arguments":{"prompt":"Premium product photo on white background","aspect_ratio":"1:1","resolution":"2K"}}}\n```',
  },
  add_mcp_server: {
    section: 'MCP',
    description:
      'Connects a new public MCP server to the workspace. Required: name and url. Optional: description and domain. Do not ask users for API keys, bearer tokens, headers, or secrets in chat. If a private MCP server needs authentication, tell the user to connect it through the secure Vibey integration flow. Domain controls which agent domains can use the server: universal/shared for all, or marketing/analyst/developer/operations. This action is restricted to high-trust agents.',
    parameters:
      'Public MCP server:\n```json\n{"action":"add_mcp_server","label":"Connecting MCP server","data":{"name":"docs","url":"https://example.com/mcp","domain":"developer"}}\n```',
  },
  remove_mcp_server: {
    section: 'MCP',
    description:
      'Removes a connected MCP server by server_id. This deletes the server config and stored MCP secret. Use list_mcp_servers first to get the id, and only call this when the user explicitly asks to disconnect/remove the server.',
    parameters:
      '```json\n{"action":"remove_mcp_server","label":"Removing MCP server","data":{"server_id":"UUID"}}\n```',
  },
  list_mcp_resources: {
    section: 'MCP',
    description:
      'Lists resources exposed by one connected MCP server. Required: either server_name or server_id. Use this before read_mcp_resource so you can copy the exact resource URI. The server must be enabled and accessible for your agent domain.',
    parameters:
      '```json\n{"action":"list_mcp_resources","label":"Checking MCP resources","data":{"server_name":"docs"}}\n```',
  },
  read_mcp_resource: {
    section: 'MCP',
    description:
      'Reads one MCP resource by URI from a connected MCP server. Required: either server_name or server_id, plus uri. Use list_mcp_resources first to get the exact uri. The server must be enabled, agent_enabled, and accessible for your agent domain.',
    parameters:
      '```json\n{"action":"read_mcp_resource","label":"Reading MCP resource","data":{"server_name":"docs","uri":"resource://example"}}\n```',
  },
  list_spaces: {
    section: 'Tasks',
    description:
      'Lists spaces visible in the current user/org context. Use before task actions when the user names a workspace but does not provide a space_id. Optional general=true lists general spaces outside a campaign. Optional limit controls result count.',
    parameters:
      '```json\n{"action":"list_spaces","label":"Finding your spaces","data":{"limit":20}}\n```\n```json\n{"action":"list_spaces","label":"Finding general spaces","data":{"general":true,"limit":20}}\n```',
  },
  search_conversations: {
    section: 'Tasks',
    description:
      'Searches the authenticated user’s active conversation history by title and returns matching conversation ids, summaries, and recent user/assistant excerpts. Use when the user asks to find or recall another chat. Search before asking the user to reconstruct prior context. Results are limited to the current user and organization.',
    parameters:
      '```json\n{"action":"search_conversations","label":"Searching your chats","data":{"query":"Wholesale Universe brand reputation","limit":10}}\n```',
  },
  search_space_context: {
    section: 'Tasks',
    description:
      'Searches semantic context across the active/current Space. Use first when the user asks what exists, what was decided, where something lives, or needs source-grounded context before reading exact docs, tasks, missions, deliverables, or conversation documents. Results include ranked chunks, context_sufficient, missing, suggested_next_queries, scores, match_reasons, and retrieve_via instructions for exact follow-up actions. Do not use this for browse/list/count workflows or known IDs. scope_override is phase 3 only.',
    parameters:
      '```json\n{"action":"search_space_context","label":"Searching this Space","data":{"query":"retainer scope guardrails","limit":10}}\n```\nWith source filter:\n```json\n{"action":"search_space_context","label":"Searching Space docs","data":{"query":"launch approval decision","source_types":["space_doc","conversation_document"],"limit":8}}\n```',
  },
  generate_visual_html: {
    section: 'Spaces',
    description:
      'Turns a Space doc (rich-text notes on a space_items row with _view_type="doc") into a self-contained HTML Visual Doc — a designed, presentation-ready render of the same content. Dual-writes a linked HTML presentation (presentation_files index.html) so Design / Markup / Tweaks work like other presentations, while the source Doc stays listed under Docs with a Visual tab. Stores the link on the doc as custom_data._doc_visual_presentation_id. User sees: a Visual Doc card in chat, the Visual tab on the doc, and the linked presentation under Presentations / All Artifacts. When: the user asks to visualize, design, turn into a visual doc, make this look polished, or asks for an HTML/one-pager version of a doc. Pass item_id of the source doc. Optionally pass style_hint (report, one-pager, landing, tree, etc.) and prompt for extra direction. The source HTML is read automatically from space_items.doc_body — do not pass it. The generated output is pure HTML, not TSX: one self-contained document with inline CSS, no scripts, and no external network calls. Re-visualize updates the same linked presentation when _doc_visual_presentation_id already exists.',
    parameters:
      '```json\n{"action":"generate_visual_html","label":"Designing your visual doc","data":{"item_id":"UUID","style_hint":"one-pager","prompt":"Bold hero with the offer, then a 3-column benefits row"}}\n```',
  },
  get_space: {
    section: 'Tasks',
    description:
      'Fetches one space with full schema.fields and schema.views. ALWAYS call this before create_task or update_task: status, priority, tags, and custom fields are user-customizable per space. For contacts, missions, IG research, or other workspace surfaces, use their dedicated action family — those are different objects.',
    parameters:
      '```json\n{"action":"get_space","label":"Reading space schema","data":{"space_id":"UUID"}}\n```',
  },
  list_space_views: {
    section: 'Spaces',
    description:
      'Lists configured views for one Space. Use after get_space when the user asks to browse a custom/research/artifact/docs/table view or when you need the exact view_id before list_space_view_items. Pass view_type only when the user named a specific surface such as docs, instagram_research, tiktok_research, youtube_research, ads_research, table, kanban, calendar, media, contacts, or channels.',
    parameters:
      '```json\n{"action":"list_space_views","label":"Finding space views","data":{"space_id":"UUID"}}\n```\nFiltered by type:\n```json\n{"action":"list_space_views","label":"Finding docs view","data":{"space_id":"UUID","view_type":"docs"}}\n```',
  },
  get_space_view: {
    section: 'Spaces',
    description:
      'Reads one configured Space view by id, including its schema/view configuration. Use after list_space_views or get_space when you need exact view metadata before listing items, choosing filters, or showing a field in that view. Do not use for task rows; use get_task when the exact task id is known.',
    parameters:
      '```json\n{"action":"get_space_view","label":"Reading space view","data":{"space_id":"UUID","view_id":"VIEW_ID"}}\n```',
  },
  create_space_field: {
    section: 'Spaces',
    description:
      'Adds a real user-created field to a Space schema. Use only after reading get_space and only when the user asked to add a field/column/property, such as a dropdown, multi-select, text, date, number, checkbox, currency, url, email, phone, rating, progress, media, or contact field. Do not fake a new field by writing only task custom_data. Required: space_id, name, type. Optional field_id lets you choose the schema key; otherwise the backend generates one from the name. options is only for select and multi_select. visible_in_view_ids makes the new field visible in existing views.',
    parameters:
      'Adding a Space field:\n```json\n{"action":"create_space_field","label":"Adding Launch Tags field","data":{"space_id":"UUID","name":"Launch Tags","type":"multi_select","options":[{"label":"Hot"},{"label":"Warm","color":"orange"}],"visible_in_view_ids":["list"]}}\n```\nAdding a text field:\n```json\n{"action":"create_space_field","label":"Adding Source field","data":{"space_id":"UUID","name":"Lead Source Notes","type":"text"}}\n```',
  },
  update_space_field: {
    section: 'Spaces',
    description:
      'Edits an existing Space schema field without deleting data. Use after get_space when the user asks to rename a non-system field, replace select/multi-select options, or make a field visible in specific existing views. Required: space_id, field_id. Optional name, options, visible_in_view_ids. The action cannot change field_id, type, system status, or delete fields. System fields cannot be renamed, but their select/multi-select options can be replaced when the user explicitly asks.',
    parameters:
      'Replacing dropdown options:\n```json\n{"action":"update_space_field","label":"Updating Status options","data":{"space_id":"UUID","field_id":"status","options":[{"id":"todo","label":"To Do","color":"cyan"},{"id":"blocked","label":"Blocked","color":"red"}]}}\n```\nRenaming and showing a custom field:\n```json\n{"action":"update_space_field","label":"Updating Source field","data":{"space_id":"UUID","field_id":"source","name":"Lead Source","visible_in_view_ids":["list","board"]}}\n```',
  },
  append_space_field_option: {
    section: 'Spaces',
    description:
      'Appends one option to an existing select or multi-select Space field without requiring the agent to resend the full options array. Use after get_space when the user asks to add a dropdown option, tag-like option, or field option and you know the field_id.',
    parameters:
      '```json\n{"action":"append_space_field_option","label":"Adding Research option","data":{"space_id":"UUID","field_id":"status","label":"Research","color":"violet"}}\n```',
  },
  create_space_status: {
    section: 'Spaces',
    description:
      'Adds one option to the system status field. Use this instead of update_space_field when the user simply asks to add a status. It preserves existing status options automatically.',
    parameters:
      '```json\n{"action":"create_space_status","label":"Adding Research status","data":{"space_id":"UUID","label":"Research","color":"violet"}}\n```',
  },
  create_space_category: {
    section: 'Spaces',
    description:
      'Adds one category option. Defaults to the category field and creates that select field if it is missing. Use field_id only when get_space shows the Space uses a different category field.',
    parameters:
      '```json\n{"action":"create_space_category","label":"Adding Content category","data":{"space_id":"UUID","label":"Content","color":"green"}}\n```',
  },
  create_space_tag: {
    section: 'Spaces',
    description:
      'Adds one tag option to the system tags field. Use this instead of replacing the full tags options array.',
    parameters:
      '```json\n{"action":"create_space_tag","label":"Adding Urgent tag","data":{"space_id":"UUID","label":"Urgent","color":"red"}}\n```',
  },
  create_space_view: {
    section: 'Spaces',
    description:
      'Creates a Space view in the schema. Use after get_space when the user asks for a new board/table/list/calendar-style view. Provide visible_field_ids from existing schema fields; do not invent field ids.',
    parameters:
      '```json\n{"action":"create_space_view","label":"Creating Research Board","data":{"space_id":"UUID","name":"Research Board","view_type":"kanban","visible_field_ids":["status","title","tags"],"config":{"group_by":"status"}}}\n```',
  },
  update_space_view: {
    section: 'Spaces',
    description:
      'Renames or reconfigures an existing Space view. Use after list_space_views/get_space_view. visible_field_ids is a full replacement list of existing schema field ids for that view.',
    parameters:
      '```json\n{"action":"update_space_view","label":"Updating Research Board","data":{"space_id":"UUID","view_id":"research_board","name":"Research Pipeline","visible_field_ids":["status","title"]}}\n```',
  },
  list_space_view_items: {
    section: 'Spaces',
    description:
      'Lists items for one Space view with filters applied in the database before limit. Use after get_space/list_space_views when the user asks for a browsable subset, count, or exact records inside a custom Space surface such as IG/TikTok research, docs, or a custom table. Pass filters using the exact schema field ids or custom_data keys from the Space/view. Use fields="summary" and small limit by default; pass include_count=true when the user asks how many match.',
    parameters:
      'Filtered summary:\n```json\n{"action":"list_space_view_items","label":"Finding matching items","data":{"space_id":"UUID","view_id":"VIEW_ID","filters":{"_view_type":"instagram_research","category":"bugs"},"status":"in_review","fields":"summary","limit":10,"include_count":true}}\n```\nSearch by title:\n```json\n{"action":"list_space_view_items","label":"Searching view items","data":{"space_id":"UUID","view_id":"VIEW_ID","search":"Hadassah Cyprus","fields":"summary","limit":10}}\n```',
  },
  get_space_item: {
    section: 'Spaces',
    description:
      'Reads one exact Space item by item_id after search_space_context, list_tasks, or list_space_view_items returns the id. Use when you need full item fields, notes, custom_data, or activity before updating or explaining a specific Space object. Required: space_id and item_id. include_activity is optional.',
    parameters:
      '```json\n{"action":"get_space_item","label":"Opening space item","data":{"space_id":"UUID","item_id":"UUID","include_activity":true}}\n```',
  },
  run_social_research_search: {
    section: 'Research',
    description:
      'Runs the same Social Research topic search used by the manual Space views, then saves the returned result snapshot into that Space. Platforms: instagram, tiktok, youtube. Use this when the user asks you to research social examples/topics and wants the search visible in the Space research view. Optional save_top_n also saves top results as Space items.',
    parameters:
      '```json\n{"action":"run_social_research_search","label":"Searching Social Research","data":{"platform":"instagram","query":"pilates studio hooks","save_top_n":5}}\n```\nWith explicit Space:\n```json\n{"action":"run_social_research_search","label":"Searching TikTok Research","data":{"space_id":"UUID","platform":"tiktok","query":"AI sales assistant demo","title":"AI sales assistant demos"}}\n```',
  },
  search_ads_research_advertisers: {
    section: 'Research',
    description:
      'Looks up advertiser/brand records for Ads Research brand searches using the same manual Space advertiser lookup. Platforms: meta, tiktok, google. Use before run_ads_research_search when kind is brand so you can pass the exact advertiser object.',
    parameters:
      '```json\n{"action":"search_ads_research_advertisers","label":"Finding advertisers","data":{"platform":"meta","query":"Nike"}}\n```',
  },
  run_ads_research_search: {
    section: 'Research',
    description:
      'Runs the same Ads Research search used by the manual Space view, then saves the returned result snapshot into that Space. Mission runs automatically link the visual snapshot to the active mission so it appears in the research report. Platforms: meta, tiktok, google. kind can be topic or brand; Google supports brand only, and all brand searches require an advertiser object from search_ads_research_advertisers. Optional save_top_n also saves top ads as Space items.',
    parameters:
      'Topic search:\n```json\n{"action":"run_ads_research_search","label":"Searching Ads Research","data":{"platform":"meta","kind":"topic","query":"fitness coaching","filters":{"country":"US"},"save_top_n":5}}\n```\nBrand search:\n```json\n{"action":"run_ads_research_search","label":"Searching brand ads","data":{"platform":"google","kind":"brand","query":"Nike","advertiser":{"id":"adv-id","name":"Nike","platform_ref":"advertiser-ref"}}}\n```',
  },
  list_contacts: {
    section: 'Contacts',
    description:
      'Lists org-scoped CRM contacts. Optional filters: search, contact_type, campaign_id, filters, include_archived, sort, limit, offset. Use this for contacts, leads, customers, or CRM records; do not store contacts as Tasks, Spaces, or Customer Brain memories.',
    parameters:
      '```json\n{"action":"list_contacts","label":"Reviewing contacts","data":{"search":"sarah","limit":20}}\n```\n```json\n{"action":"list_contacts","label":"Checking campaign customers","data":{"campaign_id":"UUID","contact_type":"customer","limit":20}}\n```',
  },
  get_contact: {
    section: 'Contacts',
    description:
      'Fetches one org-scoped CRM contact by contact_id. Use before updating arrays such as tags, because update_contact replaces arrays wholesale.',
    parameters:
      '```json\n{"action":"get_contact","label":"Opening contact","data":{"contact_id":"UUID"}}\n```',
  },
  create_contact: {
    section: 'Contacts',
    description:
      'Creates a minimal manual org-scoped CRM contact. Current create support is intentionally narrow: email is required; first_name, last_name, and phone are optional. Do not include tags, custom_fields, business fields, address fields, contact_type, contact_source, or contact_source_detail on create; create the contact first, then use update_contact for those fields.',
    parameters:
      '```json\n{"action":"create_contact","label":"Creating contact","data":{"email":"sarah@example.com","first_name":"Sarah","last_name":"Levy","phone":"+15551234567"}}\n```',
  },
  update_contact: {
    section: 'Contacts',
    description:
      'Updates an existing org-scoped CRM contact. Supports names, phone, email, tags, custom_fields, source, business_name, website, address, city, state, country, contact_type, contact_type_source, contact_type_confidence, contact_type_set_at, contact_source, and contact_source_detail. Arrays such as tags and custom_fields are replaced wholesale; read the contact first before appending, then pass confirm_replace_arrays:true with the complete intended replacement value.',
    parameters:
      '```json\n{"action":"update_contact","label":"Updating contact","data":{"contact_id":"UUID","business_name":"Acme Health","website":"https://example.com"}}\n```\n```json\n{"action":"update_contact","label":"Replacing contact tags","data":{"contact_id":"UUID","tags":["vip","lead"],"confirm_replace_arrays":true}}\n```\n```json\n{"action":"update_contact","label":"Classifying contact","data":{"contact_id":"UUID","contact_type":"customer","contact_source":"manual","contact_source_detail":"sales call"}}\n```',
  },
  add_contact_note: {
    section: 'Contacts',
    description:
      'Adds an internal CRM note to an existing org-scoped contact. Required: contact_id and non-empty content. Optional: card_tint using one of cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, red, orange, amber, yellow, lime, green, emerald, teal, slate. This is a CRM write, but it does not send a message to the contact.',
    parameters:
      '```json\n{"action":"add_contact_note","label":"Adding contact note","data":{"contact_id":"UUID","content":"Customer asked for the annual plan follow-up.","card_tint":"teal"}}\n```',
  },
  update_contact_note: {
    section: 'Contacts',
    description:
      'Updates an existing internal CRM contact note. Required: contact_id and note_id. Send content, card_tint, or both. Empty content is rejected. Use get_contact_activity first when the note_id is unknown. This is a CRM write, but it does not send a message to the contact.',
    parameters:
      '```json\n{"action":"update_contact_note","label":"Updating contact note","data":{"contact_id":"UUID","note_id":"UUID","content":"Customer asked for annual plan pricing and a Friday follow-up.","card_tint":"amber"}}\n```',
  },
  get_contact_activity: {
    section: 'Contacts',
    description:
      'Reads one contact timeline: contact created, notes, field changes, funnel submissions, campaign joins, conversation started events, and daily conversation message activity rollups. Use this when the user asks what happened with a contact or wants CRM history. This is read-only.',
    parameters:
      '```json\n{"action":"get_contact_activity","label":"Reviewing contact activity","data":{"contact_id":"UUID","limit":100}}\n```',
  },
  list_contact_communications: {
    section: 'Contacts',
    description:
      'Lists communication records for a contact. Returns emails plus linked and suggested widget, Telegram, or app conversations with preview messages. Use channel:"email" for only emails, or channel:"widget" / "telegram" / "app" for a specific conversation source. Omit include_email_bodies unless full email bodies are needed.',
    parameters:
      '```json\n{"action":"list_contact_communications","label":"Reviewing contact messages","data":{"contact_id":"UUID","limit":30}}\n```\n```json\n{"action":"list_contact_communications","label":"Checking Telegram conversations","data":{"contact_id":"UUID","channel":"telegram","limit":20}}\n```',
  },
  list_tasks: {
    section: 'Tasks',
    description:
      'Lists task rows in a space (backed by space_items) with filters applied in the database before limit. User sees these in list, board, table, and calendar views. Optional filters: status, category, filters, assigned_to_me, assignee_id, parent_item_id, search, include_closed, fields, include_count, sort_by, sort_direction, limit. For "my tasks", "tasks assigned to me", or "their tasks" meaning the current user, use assigned_to_me:true so the backend resolves the session user and matches multi-assignee rows like Home > My Tasks. Do not use unassigned for current-user tasks. Status and custom filter keys must match the space schema ids or custom_data keys; user-created labels like "fixed not pushed" are usually status option labels/ids, not product-level concepts.',
    parameters:
      '```json\n{"action":"list_tasks","label":"Reviewing tasks","data":{"space_id":"UUID","fields":"summary","limit":30}}\n```\n```json\n{"action":"list_tasks","label":"Checking my tasks","data":{"space_id":"UUID","assigned_to_me":true,"fields":"summary","include_count":true,"limit":30}}\n```\n```json\n{"action":"list_tasks","label":"Checking fixed bugs","data":{"space_id":"UUID","status":"in_review","category":"bugs","fields":"summary","include_count":true,"limit":10}}\n```\n```json\n{"action":"list_tasks","label":"Checking custom task filters","data":{"space_id":"UUID","filters":{"category":"bugs","severity":"high"},"include_closed":false,"fields":"summary","limit":10}}\n```',
  },
  get_task: {
    section: 'Tasks',
    description:
      'Fetches one task by task_id (space_items.id) with parent, subtasks, and activity. Use before updating arrays inside custom_data, especially tags, because custom_data is shallow-merged and arrays are replaced wholesale.',
    parameters:
      '```json\n{"action":"get_task","label":"Opening task","data":{"space_id":"UUID","task_id":"UUID"}}\n```',
  },
  create_task: {
    section: 'Tasks',
    description:
      'Adds a task. Required: title. space_id is OPTIONAL — if omitted, the handler uses the user\'s active message scope first, then resolves a campaign-scoped (or general) space that has a list/board/table/calendar view, or auto-creates a default "Campaign Tasks" / "My Tasks" space. Do not pass space_id or campaign_id unless the user explicitly named a different scope; for explicit cross-scope work pass scope_override:true. When the user names General, Opportunities, or another workspace/status while campaign chat is active, resolve that space (list_campaigns → General campaign → list_spaces(campaign_id) → get_space for status ids) and create_task with that space_id + scope_override:true — do not silently use the active campaign space. list_spaces({general:true}) means campaign_id IS NULL and is NOT the UI General campaign workspace. The response always includes the resolved space_id and an `ensured_space` flag. New tasks default to the space\'s open/not-started status when status is omitted. Do not create tasks as completed/done/closed; closed statuses are rejected on create_task. If the user explicitly asked to mark work complete, create the task first, then use update_task with the completed status. Top-level reserved fields: status, priority, category, assignee_type, assignee_id, assignee_name, assignee_email, start_date, due_date, description, notes, attachments, parent_item_id, sort_order, recurrence. To assign a human, use assignee_type:"human" with assignee_email, assignee_name, or assignee_id; humans are active organization members, not campaign team agents. If the user uploads images/files with the task request, pass them in attachments using `{filename,mimeType,fileUrl,sizeBytes}` so they appear on the task activity feed. Top-level category is saved as custom_data.category and may be an option id or human label such as "bug"/"BUGS" when the schema contains bugs. Everything else (including tags, email, phone, url, and user-added custom fields) goes inside custom_data keyed by schema field id. Always run get_space against the resolved space_id when you need to use specific status/priority/category/tag option ids — those are user-customizable. For contacts, missions, IG research, or other workspace surfaces, use their dedicated action family — those are different objects.',
    parameters:
      'Auto-resolve space (preferred when the user just says "add a task"):\n```json\n{"action":"create_task","label":"Adding task","data":{"title":"Follow up with Sarah","priority":"medium","due_date":"2026-05-15T12:00:00Z"}}\n```\nAssign to a human organization member by name or email:\n```json\n{"action":"create_task","label":"Adding assigned task","data":{"title":"Review launch QA","assignee_type":"human","assignee_name":"Sefy"}}\n```\nWith uploaded files/images:\n```json\n{"action":"create_task","label":"Adding task","data":{"title":"Review uploaded creative","attachments":[{"filename":"creative.png","mimeType":"image/png","fileUrl":"https://.../creative.png","sizeBytes":12345}]}}\n```\nExplicit bug task:\n```json\n{"action":"create_task","label":"Adding bug","data":{"space_id":"UUID","title":"Fix signup redirect","category":"bugs","priority":"high"}}\n```\nSubtask:\n```json\n{"action":"create_task","label":"Adding subtask","data":{"space_id":"UUID","title":"Draft reply","parent_item_id":"PARENT_TASK_UUID"}}\n```',
  },
  update_task: {
    section: 'Tasks',
    description:
      'Updates an existing task. Required: space_id, task_id. Same top-level reserved fields as create_task. To assign a human, use assignee_type:"human" with assignee_email, assignee_name, or assignee_id; humans are active organization members, not campaign team agents. Top-level category is saved as custom_data.category and may be an option id or human label. custom_data is shallow-merged: only keys you send are replaced, other custom_data keys are preserved. Arrays like tags are replaced wholesale, not appended — to add one tag, run get_task first, then send the full new tags array. Send custom_data: { someKey: null } to clear a field.',
    parameters:
      '```json\n{"action":"update_task","label":"Updating task","data":{"space_id":"UUID","task_id":"UUID","status":"in_review","custom_data":{"category":"support"}}}\n```\nAssign to a human organization member:\n```json\n{"action":"update_task","label":"Assigning task","data":{"space_id":"UUID","task_id":"UUID","assignee_type":"human","assignee_email":"sefy@example.com"}}\n```\nAppend tag after get_task:\n```json\n{"action":"update_task","label":"Updating tags","data":{"space_id":"UUID","task_id":"UUID","custom_data":{"tags":["existing-tag","new-tag"]}}}\n```',
  },
  delete_task: {
    section: 'Tasks',
    description:
      'Requests deletion of a task. Returns a confirmation card the user must approve before the task is removed.',
    parameters:
      '```json\n{"action":"delete_task","label":"Removing task","data":{"space_id":"UUID","task_id":"UUID"}}\n```',
  },
  add_task_comment: {
    section: 'Tasks',
    description:
      'Adds a comment to a task activity feed. Required: space_id, task_id, message. Optional mentions and attachments are persisted in the activity payload. Mentioning an agent may invoke that agent through the task-agent path in the main API.',
    parameters:
      '```json\n{"action":"add_task_comment","label":"Adding task comment","data":{"space_id":"UUID","task_id":"UUID","message":"Please focus on the customer success angle."}}\n```\nWith mention:\n```json\n{"action":"add_task_comment","label":"Mentioning agent","data":{"space_id":"UUID","task_id":"UUID","message":"@ivy can you review this?","mentions":[{"type":"agent","agent_key":"copywriter","label":"Ivy"}]}}\n```',
  },
  search_flow_capabilities: {
    section: 'Flows',
    description:
      'Searches the bounded Flow capability catalog for supported triggers/actions. Use before drafting or editing any flow. Pass query, kind, category, and limit to avoid unbounded step lists; never ask the user to choose from hundreds of actions.',
    parameters:
      '```json\n{"action":"search_flow_capabilities","label":"Finding Flow capabilities","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","query":"task status changed","kind":"trigger","limit":10}}\n```',
  },
  get_flow_capability: {
    section: 'Flows',
    description:
      'Reads one Flow capability contract, including required fields, compatibility notes, and examples. Use after search when a trigger/action candidate is selected or ambiguous.',
    parameters:
      '```json\n{"action":"get_flow_capability","label":"Reading capability contract","data":{"capability_id":"task.status_changed"}}\n```',
  },
  list_flows: {
    section: 'Flows',
    description:
      'Lists automation flows in the active Space. Use before editing existing flows or when the user asks what flows exist. Results are bounded; do not use as a capability catalog.',
    parameters:
      '```json\n{"action":"list_flows","label":"Reviewing flows","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","limit":25}}\n```',
  },
  get_flow: {
    section: 'Flows',
    description:
      'Reads one existing flow by automation_id. Use before updating a flow so current trigger/action payloads are preserved instead of overwritten.',
    parameters:
      '```json\n{"action":"get_flow","label":"Opening flow","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","automation_id":"FLOW_ID_FROM_UI_OR_LIST_FLOWS"}}\n```',
  },
  create_flow_draft: {
    section: 'Flows',
    description:
      'Creates a disabled draft directly in space_automations from supported trigger/action payloads. Prefer create_flow_plan and compile_flow_plan for Loop builds; use direct draft creation only when the full supported payload is already known.',
    parameters:
      '```json\n{"action":"create_flow_draft","label":"Saving Flow draft","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","name":"Done task follow-up","trigger":{"type":"status_change","to":"done"},"actions":[{"type":"add_comment","message_template":"Summary: {{summary}}"}]}}\n```',
  },
  update_flow_draft: {
    section: 'Flows',
    description:
      'Updates an existing disabled draft flow. Read the flow first with get_flow, then patch only the fields that should change.',
    parameters:
      '```json\n{"action":"update_flow_draft","label":"Updating Flow draft","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","automation_id":"FLOW_ID","name":"Updated follow-up flow"}}\n```',
  },
  validate_flow_draft: {
    section: 'Flows',
    description:
      'Validates a compiled/draft flow against automation publish rules without enabling it. Required before publish_flow.',
    parameters:
      '```json\n{"action":"validate_flow_draft","label":"Validating Flow draft","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","automation_id":"FLOW_ID"}}\n```',
  },
  publish_flow: {
    section: 'Flows',
    description:
      'Publishes a validated flow. Only call after validate_flow_draft succeeds and the admin explicitly wants the flow enabled. If backend schedule/route sync is required, stop and direct the admin to publish from /flows.',
    parameters:
      '```json\n{"action":"publish_flow","label":"Publishing Flow","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","automation_id":"FLOW_ID"}}\n```',
  },
  get_flow_build_context: {
    section: 'Flows',
    description:
      'Loads the server-composed Flow build context for one Space: Space fields, views, option refs, existing flows, template tokens, compile-ready Flow capability summary, workflow_capabilities, and context hash. Use this first. workflow_capabilities includes compile-ready trigger.*/action.* entries plus agent_action.* platform candidates; agent_action.* entries need an active blueprint or Flow runtime bridge before they can be compiled.',
    parameters:
      '```json\n{"action":"get_flow_build_context","label":"Loading Flow context","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","query":"task done follow-up"}}\n```',
  },
  create_flow_plan: {
    section: 'Flows',
    description:
      'Creates the durable Loop build plan shown in the Flow inspector. Use after build context, capability search, and any required pre-plan create_flow_clarification step. intent must stay a short summary; put trigger/action workflow detail in trigger and actions. Do not include question fields on plans.',
    parameters:
      '```json\n{"action":"create_flow_plan","label":"Drafting Flow plan","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","intent":"When a task moves to Done, summarize the outcome and create follow-up work when no next step exists.","name":"Done task follow-up","trigger":{"type":"status_change","to":"done"},"actions":[{"type":"add_comment","message_template":"Summary: {{summary}}"}]}}\n```',
  },
  create_flow_clarification: {
    section: 'Flows',
    description:
      'Creates Flow-owned pre-plan clarification questions for Loop builds. Use before create_flow_plan when required human choices remain unresolved. For three or fewer questions the UI can render the existing chat clarification card; for four or more the Flows page opens a Clarifications tab.',
    parameters:
      '```json\n{"action":"create_flow_clarification","label":"Clarifying Flow choices","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","title":"A few Flow choices","questions":[{"id":"next_step_rule","text":"How should Loop detect that a task has no next step?","type":"single_choice","options":[{"id":"no_linked_tasks","label":"No linked tasks"},{"id":"empty_next_step_field","label":"Empty Next Step field"}],"required":true}]}}\n```',
  },
  update_flow_plan: {
    section: 'Flows',
    description:
      'Updates the active Flow plan. In /flows, omit session_id; the backend attaches the active server-managed build session. Use this after clarification answers, validation errors, or manual plan corrections.',
    parameters:
      '```json\n{"action":"update_flow_plan","label":"Updating Flow plan","data":{"plan":{"status":"planned","steps":[],"trace_events":[{"type":"capability_selected","message":"Selected premade task status trigger"}]}}}\n```',
  },
  answer_flow_clarification: {
    section: 'Flows',
    description:
      'Marks Flow-owned clarification rows answered for the active build session. In /flows, omit session_id. After answers are applied, create or update the plan, validate, then compile if valid.',
    parameters:
      '```json\n{"action":"answer_flow_clarification","label":"Applying Flow answers","data":{"answers":{"next_step_rule":"no_linked_tasks"}}}\n```',
  },
  validate_flow_plan: {
    section: 'Flows',
    description:
      'Validates the active Flow plan before compile. In /flows, omit session_id. If validation fails, update the plan or add inspector clarifications instead of retrying unchanged.',
    parameters:
      '```json\n{"action":"validate_flow_plan","label":"Validating Flow plan","data":{}}\n```',
  },
  compile_flow_plan: {
    section: 'Flows',
    description:
      'Compiles the active validated Flow plan into a disabled space_automations draft. In /flows, omit session_id. Do not compile invalid plans unless the admin explicitly asked for an invalid disabled draft.',
    parameters:
      '```json\n{"action":"compile_flow_plan","label":"Compiling Flow draft","data":{}}\n```',
  },
  list_flow_blueprints: {
    section: 'Flows',
    description:
      'Lists reusable custom Flow blueprints for the Space/org. Use only after premade capability search does not cover the requested step or the user explicitly asks for reusable custom steps.',
    parameters:
      '```json\n{"action":"list_flow_blueprints","label":"Checking Flow blueprints","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","limit":20}}\n```',
  },
  get_flow_blueprint: {
    section: 'Flows',
    description:
      'Reads one custom Flow blueprint before reuse, validation, or activation. Blueprints must compile to supported automation action payloads.',
    parameters:
      '```json\n{"action":"get_flow_blueprint","label":"Reading Flow blueprint","data":{"blueprint_id":"BLUEPRINT_ID"}}\n```',
  },
  create_flow_blueprint_draft: {
    section: 'Flows',
    description:
      'Creates a draft reusable Flow blueprint that expands into supported existing automation action payloads. Do not use this to invent arbitrary code, hidden action types, or unknown external API calls.',
    parameters:
      '```json\n{"action":"create_flow_blueprint_draft","label":"Drafting Flow blueprint","data":{"space_id":"ACTIVE_SPACE_ID_FROM_CONTEXT","name":"Summarize done task and create follow-up","category":"tasks","action_template":{"actions":[{"type":"agent_summarize_task"},{"type":"add_task_comment"},{"type":"create_task"}]},"input_schema":{"type":"object","properties":{"next_step_rule":{"type":"string"}}}}}\n```',
  },
  validate_flow_blueprint: {
    section: 'Flows',
    description:
      'Validates a draft Flow blueprint before activation. Validation must prove the action_template expands into supported automation action payloads.',
    parameters:
      '```json\n{"action":"validate_flow_blueprint","label":"Validating Flow blueprint","data":{"blueprint_id":"BLUEPRINT_ID"}}\n```',
  },
  activate_flow_blueprint: {
    section: 'Flows',
    description:
      'Activates a validated Flow blueprint for reuse. Use only after validate_flow_blueprint succeeds.',
    parameters:
      '```json\n{"action":"activate_flow_blueprint","label":"Activating Flow blueprint","data":{"blueprint_id":"BLUEPRINT_ID"}}\n```',
  },
  evaluate_flow_plan: {
    section: 'Flows',
    description:
      'Records build quality metrics for the active Flow plan: capability reuse, schema errors, unsupported attempts, clarification quality, and trace count. Use after non-trivial planning or compile attempts so admins can inspect Loop quality.',
    parameters:
      '```json\n{"action":"evaluate_flow_plan","label":"Evaluating Flow build","data":{"scenario_key":"manual-loop-build","prompt":"User asked for a done-task follow-up automation."}}\n```',
  },
  create_agent: {
    section: 'Team',
    description:
      'Creates a managed agent record for HR/team expansion after list_team confirms the requested agent does not already exist. User sees: new agent card in Team. Required data fields: agent_key (lowercase snake_case), name (display name), role (job title). Recommended: level (employee by default, manager only when requested), specialty (one-line core expertise), soul (SOUL.md content), role_content (ROLE.md content), identity (IDENTITY.md content). Do not create c_level agents; C-level agents are platform-managed. Skills are opt-in only: do not pass skills, skill_seed_key, clone_skills_from, or clone_skill_keys unless the user explicitly asked for skills, asked to copy an existing agent, or approved skill setup. After success, call get_agent to verify the hire before telling the user it is ready.',
    parameters:
      'Clean hire without skills:\n```json\n{"action":"create_agent","label":"Creating Hormozi","data":{"agent_key":"business_growth_consultant","name":"Hormozi","role":"Business Growth Consultant","level":"employee","specialty":"Offer design, revenue diagnosis, sales strategy, and scaling decisions","soul":"# SOUL.md - Business Growth Consultant\\n\\n...","role_content":"# ROLE.md - Business Growth Consultant\\n\\n...","identity":"# IDENTITY.md - Business Growth Consultant\\n\\n..."}}\n```\nOnly when the user explicitly asks for skills or approves cloning:\n```json\n{"action":"create_agent","label":"Creating support agent","data":{"agent_key":"support_agent","name":"Zara","role":"Customer Support Agent","level":"employee","specialty":"Client troubleshooting, FAQ responses, and ticket triage","soul":"...","role_content":"...","identity":"...","skill_seed_key":"customer_support"}}\n```',
  },
  update_agent: {
    section: 'Team',
    description:
      "Updates an existing agent's identity files (SOUL.md, ROLE.md, IDENTITY.md) and/or name/role. Use get_agent first so the update changes only what is needed. Cannot modify system agents (vibey, hr, brain_scholar, atlas, viktor, delegator). In org scope, only admins/owners can use this. Pass agent_key (required) plus any fields to update: name, role, soul (SOUL.md content), role_content (ROLE.md content), identity (IDENTITY.md content). Required for user-facing history: include change_summary (past-tense, behavior-focused, max 120 chars; never mention file names). Changes are synced to the agent runtime immediately.",
    parameters:
      '```json\n{"action":"update_agent","label":"Updating agent identity","data":{"agent_key":"designer","soul":"...new soul content...","role_content":"...new role content...","change_summary":"Made Lux more direct and decisive"}}\n```',
  },
  get_agent: {
    section: 'Team',
    description:
      'Gets detailed information about a specific team agent — role, personality (DISC profile), specialty, communication style, values, and skills. Cannot inspect system agents (vibey, hr, atlas, brain_scholar, viktor, delegator). Returns a structured summary, not raw files. Use before update_agent to understand the current identity. Use after create_agent to verify the hire exists and matches the intended name, role, purpose, and communication style before telling the user the agent is ready.',
    parameters:
      '```json\n{"action":"get_agent","label":"Looking up agent details","data":{"agent_key":"copywriter"}}\n```',
  },
  list_team: {
    section: 'Team',
    description: 'Lists agents on the user workspace with role, level, specialty, and domain.',
    parameters: '```json\n{"action":"list_team","label":"Reviewing your team","data":{}}\n```',
  },
  audit_team_agents_and_skills: {
    section: 'Team',
    description:
      'HR-only compact audit of all team agents and their enabled skills. Use for broad team capability reviews instead of many separate list_agent_skills calls.',
    parameters:
      '```json\n{"action":"audit_team_agents_and_skills","label":"Auditing team skills","data":{}}\n```',
  },
  compare_team_skill_coverage: {
    section: 'Team',
    description:
      'HR-only comparison of skill coverage across team domains, including agents with no enabled skills and common skill keys per domain.',
    parameters:
      '```json\n{"action":"compare_team_skill_coverage","label":"Comparing team skill coverage","data":{}}\n```',
  },
  summarize_agent_capabilities: {
    section: 'Team',
    description:
      'HR-only compact capability summary for one agent or the whole team. Pass agent_key when the user asks about one teammate.',
    parameters:
      '```json\n{"action":"summarize_agent_capabilities","label":"Summarizing agent capabilities","data":{"agent_key":"copywriter"}}\n```',
  },
  dream_inspect_agent: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only tool. Inspects the current agent learning dream subject, including org-owned agent metadata and skills. It does not create or apply changes.',
    parameters:
      '```json\n{"action":"dream_inspect_agent","label":"Inspecting dream target","data":{}}\n```',
  },
  dream_search_evidence: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only tool. Searches evidence from the active dream window. Use it to inspect collected runtime, feedback, task, mission, or recommendation evidence before proposing changes.',
    parameters:
      '```json\n{"action":"dream_search_evidence","label":"Searching dream evidence","data":{"source":"skill_recommendation_events","limit":25}}\n```',
  },
  dream_propose_skill_create: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only proposal tool. Creates a pending skill creation recommendation for the dream subject. It never applies the skill directly.',
    parameters:
      '```json\n{"action":"dream_propose_skill_create","label":"Proposing new skill","data":{"skill_key":"proposal-builder","reason":"Repeated evidence shows the agent needs a reusable proposal workflow.","proposed_patch":{"name":"Proposal Builder","description":"Helps create structured proposals.","markdown_content":"# Proposal Builder\\n\\n..."}}}\n```',
  },
  dream_propose_skill_update: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only proposal tool. Creates or patches one pending skill update recommendation for the dream subject. Use this instead of update_agent_skill during dreams.',
    parameters:
      '```json\n{"action":"dream_propose_skill_update","label":"Proposing skill update","data":{"skill_key":"proposal-builder","reason":"Repeated corrections show the skill needs clearer output rules.","proposed_patch":{"markdown_content":"# Proposal Builder\\n\\nUpdated guidance..."}}}\n```',
  },
  dream_propose_skill_resource_update: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only proposal tool. Creates or patches one pending reference/resource update recommendation for a skill. It never writes the resource directly.',
    parameters:
      '```json\n{"action":"dream_propose_skill_resource_update","label":"Proposing skill resource update","data":{"skill_key":"proposal-builder","resource_path":"references/examples.md","reason":"Evidence shows examples are missing.","proposed_patch":{"content":"# Examples\\n\\n..."}}}\n```',
  },
  dream_propose_agent_file_update: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only proposal tool. Creates or patches one pending agent file update recommendation for SOUL, ROLE, or IDENTITY. It never calls update_agent or edits system files directly.',
    parameters:
      '```json\n{"action":"dream_propose_agent_file_update","label":"Proposing agent file update","data":{"target_artifact_key":"ROLE.md","reason":"Evidence shows the agent needs clearer tool-use boundaries.","proposed_patch":{"role_content":"# ROLE.md\\n\\n..."}}}\n```',
  },
  dream_route_out: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only route-out tool. Creates a hidden internal proposal for platform, system-agent, tool-schema, or unsupported-scope issues. Users do not see these.',
    parameters:
      '```json\n{"action":"dream_route_out","label":"Routing platform issue","data":{"route_out_type":"product_fix_proposal","target_artifact_kind":"tool_schema","target_artifact_key":"calendar_contract","reason":"Evidence points to a platform schema mismatch.","proposed_patch":{"summary":"Fix calendar tool schema."}}}\n```',
  },
  dream_finish: {
    section: 'Dream Ops',
    description:
      'Internal Jaime Dream Ops-only finish tool. Call once after all proposals, route-outs, or no-action reasoning are complete. The database rows created by proposal tools are authoritative; final chat text is not.',
    parameters:
      '```json\n{"action":"dream_finish","label":"Finishing dream","data":{"summary":"Created two proposals and one internal route-out.","proposal_count":2}}\n```',
  },
  list_campaign_team: {
    section: 'Team',
    description:
      'Lists agents assigned to a campaign. Pass campaign_id (UUID) or campaign_name to target a specific campaign; otherwise uses current conversation campaign.',
    parameters:
      '```json\n{"action":"list_campaign_team","label":"Checking campaign team","data":{"campaign_name":"Q2 Launch"}}\n```',
  },
  assign_agent_to_campaign: {
    section: 'Team',
    description:
      'Assigns an agent to a campaign. Pass campaign_id (UUID) or campaign_name; if omitted, uses current conversation campaign.',
    parameters:
      '```json\n{"action":"assign_agent_to_campaign","label":"Assigning to campaign","data":{"agent_key":"copywriter","campaign_name":"Q2 Launch"}}\n```',
  },
  unassign_agent_from_campaign: {
    section: 'Team',
    description:
      'Removes an agent from a campaign. Pass campaign_id (UUID) or campaign_name; if omitted, uses current conversation campaign.',
    parameters:
      '```json\n{"action":"unassign_agent_from_campaign","label":"Removing from campaign","data":{"agent_key":"copywriter","campaign_name":"Q2 Launch"}}\n```',
  },
  ask_agent: {
    section: 'Team',
    description:
      'Asks another agent a question on behalf of the user. The target agent responds with a single answer. Use when the user wants to consult a specialist (e.g. "ask the copywriter to review this headline"). If the target agent is not on the team, the backend returns hire suggestions. Required fields: `target_agent_key` (the agent_key of the agent to ask, e.g. "copywriter"), `prompt` (the question or request text).',
    parameters:
      '```json\n{"action":"ask_agent","label":"Consulting with Ivy","data":{"target_agent_key":"copywriter","prompt":"Review this headline and suggest improvements: \'Transform Your Business Today\'"}}\n```',
  },
  delegate_to_agent: {
    section: 'Team',
    description:
      'Delegates a task to another agent. The target agent receives bounded evidence from the originating chat, including available Space and campaign identifiers, then uses its tools to complete the work and return deliverables. Preserve relevant source details in `task_description`; do not paste the entire chat. Meeting-dependent delegations must check connected recording sources before claiming a call is unavailable. If the target agent is not on the team, the backend returns hire suggestions. Required fields: `target_agent_key` (the agent_key of the agent to delegate to, e.g. "developer"), `task_description` (what the agent should do).',
    parameters:
      '```json\n{"action":"delegate_to_agent","label":"Delegating to Rex","data":{"target_agent_key":"developer","task_description":"Build a responsive landing page for the Q2 product launch"}}\n```',
  },
  approve_agent_hire: {
    section: 'Team',
    description:
      "Hires an agent from the Ready Employee Library and optionally assigns them to a campaign. When delegation returns `needs_hire`, immediately call this action with the best-matching suggestion's `role_key`, then re-attempt the original delegation. Do not ask the user for approval unless there are multiple ambiguous suggestions with genuinely different roles. The role_key comes from the suggestion object returned by ask_agent or delegate_to_agent.",
    parameters:
      '```json\n{"action":"approve_agent_hire","label":"Hiring Content Researcher","data":{"role_key":"content_researcher","campaign_id":"UUID (optional)","agent_name":"Custom Name (optional)"}}\n```',
  },
  brainstorm_agents: {
    section: 'Team',
    description:
      "Starts a multi-agent brainstorm session. Multiple agents discuss a topic in rounds, building on each other's ideas. Each agent sees all prior contributions and adds new angles. Required fields: `agents` (array of agent_keys in turn order, minimum 2), `topic` (the brainstorm concept/question), `rounds` (number of discussion rounds, default 2, max 5).",
    parameters:
      '```json\n{"action":"brainstorm_agents","label":"Brainstorming Q3 positioning","data":{"agents":["niko","ivy","lux"],"topic":"Q3 product positioning strategy for enterprise segment","rounds":3}}\n```',
  },
  ask_clarification: {
    section: 'Communication',
    description:
      "Renders an interactive clarification card in studio chat when a request has multiple materially different interpretations and guessing wrong wastes real work. Ask 1-3 focused questions; each question needs `id`, `text`, `type` (`single_choice` or `multiple_choice`), and 2-5 `options` (`id` + `label`, optional `description`). Optional: `title`, `intro_message`, `required` per question (default true). The user's picks come back as the next user message. Do not use it on Slack or Telegram — ask as plain numbered text there. Do not use it for Loop Flow builds (use `create_flow_clarification`).",
    parameters:
      '```json\n{"action":"ask_clarification","label":"Clarifying the request","data":{"title":"Quick question","intro_message":"Pick a direction before I start.","questions":[{"id":"direction","text":"Which direction should I take?","type":"single_choice","required":true,"options":[{"id":"option_a","label":"Option A","description":"Why this fits"},{"id":"option_b","label":"Option B"}]}]}}\n```',
  },
  save_member_note: {
    section: 'Communication',
    description:
      'Saves an internal note about a channel or campaign member. Use when the user gives durable coordination context about a teammate/member that should be available later in the active campaign or channel context. Required: member_id and note. Optional: campaign_id or space_id when the active scope is not enough.',
    parameters:
      '```json\n{"action":"save_member_note","label":"Saving member note","data":{"member_id":"UUID","note":"Prefers async review notes before Friday planning."}}\n```',
  },
  get_member_notes: {
    section: 'Communication',
    description:
      'Reads saved internal notes for a channel or campaign member. Use before coordinating with or summarizing context about a specific member. Required: member_id. Optional: campaign_id or space_id.',
    parameters:
      '```json\n{"action":"get_member_notes","label":"Checking member notes","data":{"member_id":"UUID"}}\n```',
  },
  discover_channel_context: {
    section: 'Communication',
    description:
      'Discovers the campaign context for a Studio channel that is not already bound to one. Use only when channel instructions say no campaign is bound and you need campaign-scoped context. Required: channel_id. If several plausible campaigns are returned, ask the user to pick before binding.',
    parameters:
      '```json\n{"action":"discover_channel_context","label":"Finding channel context","data":{"channel_id":"UUID"}}\n```',
  },
  set_channel_context: {
    section: 'Communication',
    description:
      'Binds or clears the campaign context for a Studio channel after discover_channel_context returns one clear match or the user confirms the campaign. Required: channel_id. Pass campaign_id to bind; omit campaign_id to clear.',
    parameters:
      '```json\n{"action":"set_channel_context","label":"Binding channel context","data":{"channel_id":"UUID","campaign_id":"UUID"}}\n```',
  },
  create_campaign: {
    section: 'Campaign',
    description:
      'Creates a Vibey campaign. Use when the user explicitly asks to create a new campaign, launch workspace, or campaign container. Required: name. Optional: campaign_type and config.',
    parameters:
      '```json\n{"action":"create_campaign","label":"Creating campaign","data":{"name":"Q3 Launch","campaign_type":"get-more-leads","config":{"goal":"lead generation"}}}\n```',
  },
  list_campaigns: {
    section: 'Campaign',
    description:
      'Lists campaigns relevant to the current context. Use when the user names a campaign but you need its id, asks what campaigns exist, or you need to resolve a campaign before a campaign-scoped action. For plural, portfolio, client-wide, or organization-wide questions use mode:"accessible" rather than inheriting one active campaign.',
    parameters:
      '```json\n{"action":"list_campaigns","label":"Reviewing campaigns","data":{}}\n```\nAll accessible campaigns:\n```json\n{"action":"list_campaigns","label":"Reviewing campaigns","data":{"mode":"accessible"}}\n```',
  },
  get_campaign: {
    section: 'Campaign',
    description:
      'Reads one campaign by id. Use after list_campaigns, channel context discovery, or an active scope gives you the campaign_id and you need exact campaign settings/context.',
    parameters:
      '```json\n{"action":"get_campaign","label":"Opening campaign","data":{"campaign_id":"UUID"}}\n```',
  },
  update_campaign: {
    section: 'Campaign',
    description:
      'Updates basic campaign metadata. Use only when the user explicitly asks to rename, describe, or change status for an existing campaign. Optional fields: campaign_id, name, description, status. Omit unchanged fields.',
    parameters:
      '```json\n{"action":"update_campaign","label":"Updating campaign","data":{"campaign_id":"UUID","name":"Q3 Launch - Enterprise","description":"Enterprise launch campaign"}}\n```',
  },
  update_campaign_context: {
    section: 'Campaign',
    description:
      'Updates stored campaign context / brief fields used by downstream tools. User sees: updated brief in campaign Settings. When: user provides new business context, changes positioning, or refines target market.',
    parameters:
      '```json\n{"action":"update_campaign_context","label":"Updating campaign context","data":{"summary":"..."}}\n```',
  },
  create_awareness_point: {
    section: 'Campaign',
    description:
      'Creates an awareness / signal point on the North Star workflow. User sees: signal point on the campaign Strategy canvas.',
    parameters:
      '```json\n{"action":"create_awareness_point","label":"Logging awareness","data":{"title":"...","body":"..."}}\n```',
  },
  update_awareness: {
    section: 'Campaign',
    description: 'Updates awareness state or notes.',
    parameters:
      '```json\n{"action":"update_awareness","label":"Updating awareness","data":{"awareness_id":"UUID"}}\n```',
  },
  get_social_post_template: {
    section: 'Social',
    description: 'Fetches one social post template by id.',
    parameters:
      '```json\n{"action":"get_social_post_template","label":"Loading post template","data":{"template_id":"UUID"}}\n```',
  },
  list_social_post_templates: {
    section: 'Social',
    description: 'Lists reusable social post templates.',
    parameters:
      '```json\n{"action":"list_social_post_templates","label":"Reviewing post templates","data":{}}\n```',
  },
  list_campaign_media: {
    section: 'Media',
    description: 'Lists media assets attached to the campaign.',
    parameters:
      '```json\n{"action":"list_campaign_media","label":"Reviewing campaign media","data":{}}\n```',
  },
  ingest_user_brain_document: {
    section: 'Brain',
    description:
      'Ingests a user-uploaded document into the brain pipeline. **document_id is REQUIRED**. User sees: extracted knowledge appears as memories in Brain. Processes the document content into structured memory entries.',
    parameters:
      '```json\n{"action":"ingest_user_brain_document","label":"Ingesting your document","data":{"content":"Document text","source_title":"Upload"}}\n```',
  },
  ingest_agent_brain_text: {
    section: 'Brain',
    description:
      'Ingests raw text into an AGENT brain. brain_id (from resolve_agent_brain), text, sourceType, and title are ALL REQUIRED. title becomes the source name grouping entries for search and transfer. User sees: entry searchable via search_agent_brain. The agent uses this knowledge in future conversations.',
    parameters:
      '```json\n{"action":"ingest_agent_brain_text","label":"Adding agent knowledge from text","data":{"brain_id":"UUID-from-resolve_agent_brain","text":"Full text content to ingest...","sourceType":"document","title":"Descriptive Source Name","domain":"sales"}}\n```',
  },
  ingest_agent_brain_link: {
    section: 'Brain',
    description:
      'Ingests a URL into an AGENT brain. brain_id (from resolve_agent_brain) and url are REQUIRED. Optional title overrides the extracted page title. Content is extracted from the URL and stored as agent brain entries.',
    parameters:
      '```json\n{"action":"ingest_agent_brain_link","label":"Adding agent knowledge from link","data":{"brain_id":"UUID-from-resolve_agent_brain","url":"https://example.com/article","title":"Optional Override Title"}}\n```',
  },
  ingest_fathom_meeting: {
    section: 'Brain',
    description:
      'Imports a Fathom meeting recording/transcript. **meeting_id is REQUIRED**. User sees: meeting insights appear as memories in Brain with source attribution.',
    parameters:
      '```json\n{"action":"ingest_fathom_meeting","label":"Importing Fathom meeting","data":{"meeting_id":"..."}}\n```',
  },
  ingest_fireflies_transcript: {
    section: 'Brain',
    description:
      'Imports a Fireflies transcript. **transcript_id is REQUIRED**. User sees: transcript insights appear as memories in Brain with source attribution.',
    parameters:
      '```json\n{"action":"ingest_fireflies_transcript","label":"Importing Fireflies transcript","data":{"transcript_id":"..."}}\n```',
  },
  bulk_create_ads: {
    section: 'Ads',
    description:
      'Creates multiple ad artifacts in one call from structured inputs. User sees: multiple ad cards in Studio > Ads. Use when creating ad variations or A/B test sets.',
    parameters:
      '```json\n{"action":"bulk_create_ads","label":"Creating your ad set creatives","data":{"ads":[]}}\n```',
  },
  get_daily_report_data: {
    section: 'Analytics',
    description:
      'Returns campaign analytics (funnels, emails, ads, social post counts, Meta insights) for a rolling time window expressed in hours (1-168, default 24). Useful for a quick last-N-hours snapshot. For the aggregated view with rates, trend, contribution, and alerts — prefer get_campaign_main_dashboard.',
    parameters:
      '```json\n{"action":"get_daily_report_data","label":"Pulling your daily report","data":{"hours":24}}\n```',
  },
  get_campaign_main_dashboard: {
    section: 'Analytics',
    description:
      'Returns the aggregated campaign dashboard in one call: executive KPIs (leads, conversion, open rate, engagement, reach, visitors), per-channel summaries (funnels / emails / ads / social), unified daily timeseries, contribution breakdown by source, and threshold-based alerts. Same numbers the user sees on the Studio > Dashboard > Overview tab. Start here for any "how is my campaign doing" question. For organization-wide health, first list accessible campaigns, call this once per eligible active client campaign, and distinguish missing or partial data from a real KPI alert.',
    parameters:
      '```json\n{"action":"get_campaign_main_dashboard","label":"Loading your dashboard","data":{}}\n```\n```json\n{"action":"get_campaign_main_dashboard","label":"Loading this month\'s performance","data":{"since":"2026-04-01T00:00:00Z","until":"2026-04-30T23:59:59Z"}}\n```',
  },
  get_campaign_social_analytics: {
    section: 'Analytics',
    description:
      'Returns per-platform social performance for a campaign: reach, impressions, engagement rate, follower count/growth, per-post metrics (likes, comments, shares, saves, views, reels watch time), and a daily chart. Required: platform ("instagram" | "linkedin"). Call once per platform. Use when user asks about social performance, top posts, engagement, or when main-dashboard flags social as partial.',
    parameters:
      '```json\n{"action":"get_campaign_social_analytics","label":"Checking Instagram performance","data":{"platform":"instagram"}}\n```\n```json\n{"action":"get_campaign_social_analytics","label":"Checking LinkedIn performance","data":{"platform":"linkedin","since":"2026-04-01T00:00:00Z"}}\n```',
  },
  get_campaign_stripe_overview: {
    section: 'Analytics',
    description:
      'Returns campaign revenue from Stripe: gross, refunds, fees, net, refund rate, transaction count, and a daily chart. Accepts ISO dates (since/until) or epoch seconds (from_unix/to_unix). If Stripe is not connected the response is { success:false, connected:false }; treat that as "skip the revenue section" and mention to the user instead of erroring out.',
    parameters:
      '```json\n{"action":"get_campaign_stripe_overview","label":"Pulling revenue","data":{}}\n```\n```json\n{"action":"get_campaign_stripe_overview","label":"Pulling last 30 days of revenue","data":{"since":"2026-03-20T00:00:00Z","until":"2026-04-20T23:59:59Z"}}\n```',
  },
  generate_ad_copy: {
    section: 'Ads',
    description:
      'Saves ad copy variations you wrote. The agent writes the copy using campaign context (offer, avatar, brand voice) then passes the structured result here. Each variation must have headline (5-12 words), primaryText (50-150 words, direct-response style), and description (10-20 words). Write in second person. Be specific with numbers/results. Each variation should take a DIFFERENT angle (urgency, social proof, benefit, curiosity, etc.).',
    parameters:
      '```json\n{"action":"generate_ad_copy","label":"Writing ad copy","data":{"variations":[{"headline":"Your Headline Here","primaryText":"Your primary text here...","description":"Short description here"}]}}\n```',
  },
  send_user_message: {
    section: 'Communication',
    description:
      'Sends a message to the user on their preferred channel (Slack, Telegram, or in-app notification). Use when you need to proactively inform the user about something important during a mission — e.g. a blocker, a question, a status update, or a deliverable ready for review. The message is delivered to ALL configured channels (Slack + Telegram) plus in-app.',
    parameters:
      '```json\n{"action":"send_user_message","label":"Notifying user","data":{"message":"Your landing page is ready for review — take a look when you have a moment."}}\n```',
  },
  supabase_list_tables: {
    section: 'Supabase Database',
    description:
      'Lists all tables in the public schema of the linked Supabase database. Returns each table with its column definitions (name, data_type, is_nullable, is_primary_key, default_value) and row count. ALWAYS call this first to understand the current schema before creating or modifying tables. Requires project_id (the Vibey project UUID, not the Supabase ref).',
    parameters:
      '```json\n{"action":"supabase_list_tables","label":"Checking database schema","data":{"project_id":"UUID"}}\n```\n\n**Response schema:**\n```json\n{"success":true,"tables":[{"name":"profiles","columns":[{"name":"id","dataType":"uuid","isNullable":false,"isPrimaryKey":true,"defaultValue":"gen_random_uuid()"},{"name":"name","dataType":"text","isNullable":false,"isPrimaryKey":false,"defaultValue":null}],"rowCount":42}]}\n```',
  },
  supabase_run_sql: {
    section: 'Supabase Database',
    description:
      'Executes arbitrary SQL against the linked Supabase database. The power tool — use for DDL (CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE INDEX, CREATE POLICY), DML (INSERT, UPDATE, DELETE), or complex queries (JOINs, CTEs, aggregations). SELECT/WITH queries use the read-only endpoint automatically; all other statements use the write endpoint. Use this for migrations, RLS policies, indexes, and anything supabase_create_table cannot express. Requires project_id and query (raw SQL string).',
    parameters:
      '```json\n{"action":"supabase_run_sql","label":"Running SQL migration","data":{"project_id":"UUID","query":"CREATE TABLE public.profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, created_at timestamptz DEFAULT now()); ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;"}}\n```\n\n**Parameters:**\n- `project_id` (string, required): Vibey project UUID\n- `query` (string, required): Raw SQL to execute. Can be multi-statement separated by `;`\n\n**Response schema:**\n```json\n{"success":true,"result":[{"id":"...","name":"..."}]}\n```\n\n**Common patterns:**\n- Create RLS policy: `CREATE POLICY "users_own_rows" ON public.profiles FOR ALL USING (auth.uid() = user_id);`\n- Add column: `ALTER TABLE public.profiles ADD COLUMN avatar_url text;`\n- Create index: `CREATE INDEX idx_profiles_email ON public.profiles(email);`\n- Add foreign key: `ALTER TABLE public.posts ADD CONSTRAINT fk_author FOREIGN KEY (author_id) REFERENCES public.profiles(id);`',
  },
  supabase_create_table: {
    section: 'Supabase Database',
    description:
      'Creates a new table in the public schema with structured column definitions. Enables RLS by default (set enable_rls:false to disable). Prefer this over supabase_run_sql for straightforward table creation. For complex schemas (foreign keys, unique constraints, check constraints, multi-column PKs), use supabase_run_sql instead.',
    parameters:
      '```json\n{"action":"supabase_create_table","label":"Creating profiles table","data":{"project_id":"UUID","table_name":"profiles","columns":[{"name":"id","type":"uuid","primary_key":true,"default":"gen_random_uuid()"},{"name":"name","type":"text","nullable":false},{"name":"email","type":"text"},{"name":"created_at","type":"timestamptz","default":"now()"}],"enable_rls":true}}\n```\n\n**Parameters:**\n- `project_id` (string, required): Vibey project UUID\n- `table_name` (string, required): Table name (lowercase, underscores)\n- `columns` (array, required): Column definitions:\n  - `name` (string, required): Column name\n  - `type` (string, required): Postgres type — uuid, text, int4, int8, bool, timestamptz, jsonb, float8, etc.\n  - `primary_key` (boolean, optional): Mark as PK\n  - `nullable` (boolean, optional, default true): Set NOT NULL when false\n  - `default` (string, optional): SQL default expression — gen_random_uuid(), now(), true, 0, etc.\n- `enable_rls` (boolean, optional, default true): Enable Row Level Security\n\n**Response:** Returns the SQL execution result',
  },
  supabase_insert_rows: {
    section: 'Supabase Database',
    description:
      'Inserts one or more rows into a table. Use for seeding data, creating initial records, or populating lookup tables. Each row is a key-value object where keys match column names. Columns with defaults (like id with gen_random_uuid()) can be omitted. Returns the count of inserted rows.',
    parameters:
      '```json\n{"action":"supabase_insert_rows","label":"Seeding sample data","data":{"project_id":"UUID","table":"profiles","rows":[{"name":"Alice","email":"alice@example.com"},{"name":"Bob","email":"bob@example.com"}]}}\n```\n\n**Parameters:**\n- `project_id` (string, required): Vibey project UUID\n- `table` (string, required): Table name in public schema\n- `rows` (array, required): Array of row objects. Each object maps column_name → value\n\n**Response:**\n```json\n{"success":true,"inserted":2}\n```',
  },
  supabase_update_rows: {
    section: 'Supabase Database',
    description:
      'Updates a single row in a table identified by primary key. Provide primary_keys (PK column names and values to match) and data (column names and new values to set). Only updates the specified columns; other columns remain unchanged.',
    parameters:
      '```json\n{"action":"supabase_update_rows","label":"Updating record","data":{"project_id":"UUID","table":"profiles","primary_keys":{"id":"550e8400-e29b-41d4-a716-446655440000"},"data":{"name":"Alice Updated","email":"newalice@example.com"}}}\n```\n\n**Parameters:**\n- `project_id` (string, required): Vibey project UUID\n- `table` (string, required): Table name\n- `primary_keys` (object, required): PK column→value pairs identifying the row\n- `data` (object, required): Column→value pairs to update\n\n**Response:**\n```json\n{"success":true,"row":{"id":"...","name":"Alice Updated","email":"newalice@example.com"}}\n```',
  },
  supabase_delete_rows: {
    section: 'Supabase Database',
    description:
      'Deletes a single row from a table identified by primary key. Provide primary_keys with PK column values to match. The row is permanently deleted.',
    parameters:
      '```json\n{"action":"supabase_delete_rows","label":"Removing record","data":{"project_id":"UUID","table":"profiles","primary_keys":{"id":"550e8400-e29b-41d4-a716-446655440000"}}}\n```\n\n**Parameters:**\n- `project_id` (string, required): Vibey project UUID\n- `table` (string, required): Table name\n- `primary_keys` (object, required): PK column→value pairs identifying the row\n\n**Response:**\n```json\n{"success":true}\n```',
  },
}
