# Blog

## create_blog_post
**Optional keys:** `title`, `content`, `markdown`, `campaign_id`, `campaignId`, `space_id`, `scope_override`

**Types:** `title`: string, `content`: string, `markdown`: string, `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string

Creates blog post for funnel site. User sees: blog post in the funnel's Blog tab, published to the funnel site at /blog. Requires funnel_id — the blog belongs to a specific funnel site.

```json
{"action":"create_blog_post","label":"Drafting your blog post","data":{"funnel_id":"UUID","title":"Post","slug":"post","content":[]}}
```

## delete_blog_post
**Required keys:** `blog_post_id`

Requests deletion of a blog post. Returns a confirmation card the user must approve.

```json
{"action":"delete_blog_post","label":"Removing your blog post","data":{"blog_post_id":"UUID"}}
```

## get_blog_post
**Required keys:** `blog_post_id`

Fetches blog post by id.

```json
{"action":"get_blog_post","label":"Loading your blog post","data":{"blog_post_id":"UUID"}}
```

## list_blog_posts
**Optional keys:** `campaign_id`, `campaignId`, `space_id`, `scope_override`

**Types:** `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string

Lists blog posts.

```json
{"action":"list_blog_posts","label":"Reviewing your blog library","data":{"funnel_id":"UUID"}}
```

## update_blog_post
**Required keys:** `blog_post_id`

Updates blog post.

```json
{"action":"update_blog_post","label":"Updating your blog post","data":{"blog_post_id":"UUID","title":"Updated"}}
```
