# Social

## create_social_post
**Required keys:** `platform`, `post_type`

Relevant skill: read `skills/social-content-builder/SKILL.md`. Social content work needs platform format, post type, and creative quality guidance. Read before creating or editing organic social posts.

Creates social post artifact. post_type must be one of: single_image, carousel, text_only, story, reel. Use text_only for LinkedIn text-only posts (no image required). Use single_image / story / reel when the post includes a visual. Optional **video_url** (public HTTPS URL) and **video_asset_id** (media library UUID) attach video — Studio preview plays video; **Instagram and LinkedIn scheduled publishing both support video** (reels, feed video, LinkedIn native video). **image_url** / **image_asset_id** remain for static images. Users can also attach/replace/remove videos directly from the Studio > Social preview (single post and per-carousel-slide), so you do not always need to set media yourself. User sees: post card in Studio > Social with platform preview and media attach controls. Use publish_social_post or schedule_social_post after creation.

```json
{"action":"create_social_post","label":"Drafting your social post","data":{"platform":"instagram","post_type":"reel","caption":"Hook","video_url":"https://...mp4"}}
```

```json
{"action":"create_social_post","label":"Drafting your social post","data":{"platform":"instagram","post_type":"reel","video_asset_id":"UUID"}}
```

## delete_social_post
**Required keys:** `social_post_id`

Requests deletion of a social post. Returns a confirmation card the user must approve.

```json
{"action":"delete_social_post","label":"Removing your social post","data":{"social_post_id":"UUID"}}
```

## get_social_post
**Required keys:** `social_post_id`

Fetches one social post by id.

```json
{"action":"get_social_post","label":"Loading your social post","data":{"social_post_id":"UUID"}}
```

## get_social_post_template
**Required keys:** `template_id`

**Optional keys:** `template_id`

**Types:** `template_id`: string

Relevant skill: read `skills/social-content-builder/SKILL.md`. Social content work needs platform format, post type, and creative quality guidance. Read before creating or editing organic social posts.

Fetches one social post template by id.

```json
{"action":"get_social_post_template","label":"Loading post template","data":{"template_id":"UUID"}}
```

## list_social_post_templates
**Optional keys:** `platform`

**Types:** `platform`: string

Relevant skill: read `skills/social-content-builder/SKILL.md`. Social content work needs platform format, post type, and creative quality guidance. Read before creating or editing organic social posts.

Lists reusable social post templates.

```json
{"action":"list_social_post_templates","label":"Reviewing post templates","data":{}}
```

## list_social_posts
**Optional keys:** `campaign_id`, `campaignId`, `space_id`, `scope_override`, `platform`, `status`

**Types:** `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string, `platform`: string, `status`: string

Lists social posts.

```json
{"action":"list_social_posts","label":"Reviewing social content","data":{}}
```

## publish_social_post
**Required keys:** `social_post_id`

Relevant skill: read `skills/social-content-builder/SKILL.md`. Social content work needs platform format, post type, and creative quality guidance. Read before creating or editing organic social posts.
Relevant skill: read `skills/social-publisher/SKILL.md`. Publishing social content needs channel safety, connected account, and scheduling guidance. Read before publishing or scheduling social posts.

Publishes social post to platform. User sees: post status changes to Published in Studio > Social; post goes live on the platform. Requires: post created first with create_social_post and platform integration connected.

```json
{"action":"publish_social_post","label":"Publishing your post","data":{"social_post_id":"UUID"}}
```

## schedule_social_post
**Required keys:** `social_post_id`, `scheduled_at`

Relevant skill: read `skills/social-content-builder/SKILL.md`. Social content work needs platform format, post type, and creative quality guidance. Read before creating or editing organic social posts.
Relevant skill: read `skills/social-publisher/SKILL.md`. Publishing social content needs channel safety, connected account, and scheduling guidance. Read before publishing or scheduling social posts.

Schedules a social post for future publishing. Supported: Instagram (single image, single video/reel, image carousel, mixed image+video carousel) and LinkedIn (single image, single video, text-only, PDF carousel). Non–text-only posts require media (image or video) before scheduling; carousel posts require image_url or video_url on every slide. User sees: post status changes to Scheduled with publish time in Studio > Social. Requires: post created first with create_social_post.

```json
{"action":"schedule_social_post","label":"Scheduling your post","data":{"social_post_id":"UUID","scheduled_at":"2026-03-20T10:00:00Z"}}
```

## update_social_post
**Required keys:** `social_post_id`

Relevant skill: read `skills/social-content-builder/SKILL.md`. Social content work needs platform format, post type, and creative quality guidance. Read before creating or editing organic social posts.

Updates social post data. Three modes for carousel slides — pick the smallest one that fits your change:

1. **carousel_slide_patch** — find-and-replace on one slide's TSX. Use when fixing a style, swapping a label, or changing a few lines. Fastest: you only output the diff, not the full TSX. Saves the user time and your tokens.
2. **carousel_slide_update** — replace one slide's fields (tsx, caption, image_url) while keeping all other slides untouched. Use when you need to rewrite an entire slide from scratch but the rest of the carousel is fine.
3. **carousel_slides** (full array) — replaces every slide. Use only when creating all slides for the first time or restructuring the entire carousel.

Default to carousel_slide_patch for edits. Only escalate to carousel_slide_update if the slide needs a full rewrite. Sending carousel_slides when editing one slide will wipe the others.

**Video:** set **video_url** and/or **video_asset_id** on the post, or **video_url** / **video_asset_id** on a carousel slide via **carousel_slide_update**. Instagram carousels with any video slide are published as mixed image+video carousels. LinkedIn single-video posts are published as native LinkedIn video. Users can also attach videos directly from the Studio > Social preview without asking you.

```json
{"action":"update_social_post","label":"Refining your post","data":{"social_post_id":"UUID","caption":"Updated"}}
```

```json
{"action":"update_social_post","label":"Adding reel media","data":{"social_post_id":"UUID","video_url":"https://...mp4"}}
```

```json
{"action":"update_social_post","label":"Fixing slide 2 style","data":{"social_post_id":"UUID","carousel_slide_patch":{"index":1,"replacements":[{"find":"filter: 'saturate(1)'","replace":"filter: 'saturate(0.4) brightness(0.9)'"},{"find":"THE ISSUE","replace":"THE PROBLEM"}]}}}
```

```json
{"action":"update_social_post","label":"Rebuilding slide 2","data":{"social_post_id":"UUID","carousel_slide_update":{"index":1,"tsx":"<full new tsx>"}}}
```
