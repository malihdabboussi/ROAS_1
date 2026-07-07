# Blog Website Integration

Last Modified: 2026-06-15

## Overview

Blog posts attach to websites through the existing shared storage model:

- Website: `funnels.id` where `funnel_type = "website"`.
- Pages: `funnel_pages.funnel_id`.
- Blog posts: `blog_posts.funnel_id -> funnels.id`.

There is no `websites` table.

## Data Flow

```
create_website/list_websites/get_website
  -> returns website funnel id
  -> add_website_page creates /blog and /blog/template pages
  -> create_blog_post stores posts with the same funnel_id
  -> renderer injects blogPosts/blogPagination/blogPost/relatedBlogPosts
  -> optional WordPress publish uses blog_posts.id
  -> writes wordpress_post_id/wordpress_post_url/wordpress_synced_at to blog_posts.metadata
```

## Page Types

| Page               | `page_type`    | `path`           |
| ------------------ | -------------- | ---------------- |
| Blog index         | `blog-listing` | `/blog`          |
| Blog post template | `blog-post`    | `/blog/template` |

## Agent Workflow

1. Resolve the website with `list_websites` or `get_website`.
2. Add the blog listing page with `add_website_page`.
3. Add the blog post template page with `add_website_page`.
4. Add `/blog` to the website layout navigation.
5. Create content with `create_blog_post` using the website `funnel_id`.
6. Optional: publish to WordPress with `use_integration` → `wordpress.publish_blog_post`.

## Decision Log

- **2026-06-04** — Documented Blog as connected to first-class Website through `blog_posts.funnel_id`. Reason: Website is first-class in API/UX only; DB storage remains shared.
- **2026-06-04** — Kept Blog under website routing instead of standalone artifact routing. Reason: published blog URLs and renderer scope variables are website-page based.
- **2026-06-15** — Added optional WordPress publishing through the native `wordpress` integration. Reason: external WordPress publishing should reuse `blog_posts` as source of truth and store sync metadata on the existing blog post row.
