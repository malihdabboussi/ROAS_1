# Blog Integration — Reference

How Vibey’s blog connects to a generated website: server-injected scope data, URL conventions, agent actions, and production-ready TSX patterns for listing and post templates.

---

## 1. Overview

The blog system attaches **content posts** to a **website** (funnel). The renderer injects **scope variables** into TSX so pages can render lists, pagination, a single post body, and related posts—without fetching in the browser.

- **`blog-listing`** pages receive `blogPosts`, `blogPagination`, and (via query params) filtered/paginated results.
- **`blog-post`** pages receive `blogPost` and `relatedBlogPosts` (up to three, tag-matched).
- **URLs** are stable: `/blog` for the index, `/blog/[slug]` for articles. Internal navigation uses **`data-vibey-link`** (no manual router imports).

Agent workflows use **`create_blog_post`**, **`list_blog_posts`**, **`update_blog_post`**, and **`delete_blog_post`** so content stays tied to the same `funnel_id` as the site.

**TSX runtime:** React, Framer Motion (`FramerMotion` global with `motion`, `useInView`, etc.), Lucide icons, anime.js, Tailwind CSS classes. **No imports.** Use a local **`theme`** object for colors. Internal links use **`data-vibey-link`**.

---

## 2. Renderer scope variables

| Variable           | Where                       | Purpose                                                          |
| ------------------ | --------------------------- | ---------------------------------------------------------------- |
| `blogPosts`        | `page_type: "blog-listing"` | Array of post summaries/objects for the current page of results. |
| `blogPagination`   | `page_type: "blog-listing"` | Pagination and tag filter state (see interfaces below).          |
| `blogPost`         | `page_type: "blog-post"`    | One full post for the current slug.                              |
| `relatedBlogPosts` | `page_type: "blog-post"`    | Up to 3 related posts (shared tags).                             |

### Post fields (listing and detail)

Each item in `blogPosts` and the `blogPost` object includes:

- `id`
- `title`
- `slug`
- `excerpt`
- `content` — array of **content blocks** (see `BlogContentBlock` below)
- `cover_image`
- `author`
- `tags` — `string[]`
- `published_at`
- `created_at`
- `updated_at`
- `seo` — `{ title, description, og_image }`

### `blogPagination` shape

- `page` — current page number
- `pageSize` — page size
- `total` — total posts matching filters
- `totalPages` — total pages
- `tag` — active tag filter or `null`
- `tags` — all tags available for filter pills (strings)

---

## 3. URL structure and query params

| Route               | Template       | Notes                                      |
| ------------------- | -------------- | ------------------------------------------ |
| `/blog`             | `blog-listing` | Lists posts; supports query params.        |
| `/blog/[post-slug]` | `blog-post`    | Renders one post; `blogPost` matches slug. |

**Query params on `/blog`:**

- `page` — e.g. `?page=2`
- `page_size` — e.g. `?page_size=10`
- `tag` — e.g. `?tag=marketing`

Example: `/blog?page=2&page_size=10&tag=marketing`

Use these on **`data-vibey-link`** for pagination and tag filters, e.g. `data-vibey-link="/blog?page=2&tag=marketing"`.

---

## 4. Agent actions (API surface)

| Action             | Role                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_blog_post` | Create a post for a website (`funnel_id`). Fields: `title`, `slug`, `content`, `excerpt`, `cover_image`, `author`, `tags`, `seo`, `status`. |
| `list_blog_posts`  | List posts for a website.                                                                                                                   |
| `update_blog_post` | Update an existing post.                                                                                                                    |
| `delete_blog_post` | Delete a post.                                                                                                                              |

---

## 5. Setup flow (step-by-step)

1. **Create the blog listing page** in the website layout:
   - `page_type: "blog-listing"`
   - `path: "/blog"`
   - TSX uses `blogPosts` and `blogPagination`.

2. **Create the blog post template page:**
   - `page_type: "blog-post"`
   - `path: "/blog/template"` (template route for the post layout; runtime resolves `/blog/[slug]` to this page type)
   - TSX uses `blogPost`, `relatedBlogPosts`.

3. **Add `/blog` to the site navigation** in the website nav layout so visitors can reach the listing (e.g. label “Journal”, “Blog”, or “Insights”).

4. **Seed content** with `create_blog_post` for each article (draft or published per `status`), then verify listing and detail routes in preview.

---

## 6. Data shapes (TypeScript interfaces)

Use these as the mental model for scope variables (adjust if your pipeline adds optional fields).

```ts
interface BlogSeo {
  title: string
  description: string
  og_image: string | null
}

type BlogContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'image'; src: string; alt?: string; caption?: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string; attribution?: string }
  | { type: 'code'; language?: string; code: string }

interface BlogPostScope {
  id: string
  title: string
  slug: string
  excerpt: string
  content: BlogContentBlock[]
  cover_image: string | null
  author: string
  tags: string[]
  published_at: string | null
  created_at: string
  updated_at: string
  seo: BlogSeo
}

interface BlogPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  tag: string | null
  tags: string[]
}

// blog-listing page
declare const blogPosts: BlogPostScope[]
declare const blogPagination: BlogPagination

// blog-post page
declare const blogPost: BlogPostScope
declare const relatedBlogPosts: BlogPostScope[]
```

---

## 7. Blog listing page — TSX example

Editorial layout: **masthead**, **featured hero post**, **tag ribbon**, **asymmetric story grid** (not a uniform card deck), **pagination**. Uses `motion` + `useInView` for scroll reveals, `theme` for colors, and `data-vibey-link` for all internal URLs.

```tsx
const { useRef, useMemo } = React
const { motion, useInView } = FramerMotion

const theme = {
  ink: '#0c0a09',
  inkMuted: '#57534e',
  paper: '#fafaf9',
  paper2: '#f5f5f4',
  line: '#e7e5e4',
  accent: '#ea580c',
  accentSoft: '#fff7ed',
}

const Reveal = ({ children, delay = 0 }) => {
  const ref = useRef(null)
  const inv = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inv ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const TagPill = ({ label, active, href }) => (
  <a
    data-vibey-link={href}
    className="inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-200"
    style={{
      background: active ? theme.ink : 'transparent',
      color: active ? theme.paper : theme.inkMuted,
      borderColor: active ? theme.ink : theme.line,
    }}
  >
    {label}
  </a>
)

const StoryCard = ({ post, large, index }) => {
  const href = `/blog/${post.slug}`
  return (
    <motion.a
      data-vibey-link={href}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border ${large ? 'min-h-[280px] md:col-span-2 md:grid md:grid-cols-12 md:gap-0' : ''}`}
      style={{ borderColor: theme.line, background: theme.paper }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <div
        className={`relative overflow-hidden ${large ? 'h-56 md:col-span-7 md:h-auto' : 'h-44'}`}
      >
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, ${theme.paper2})` }}
          />
        )}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `${theme.ink}18` }}
        />
      </div>
      <div
        className={`flex flex-1 flex-col p-6 md:p-8 ${large ? 'justify-center md:col-span-5' : ''}`}
      >
        <p
          className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: theme.accent }}
        >
          {post.tags?.[0] || 'Article'}
        </p>
        <h3
          className={`mb-3 text-balance font-serif leading-tight ${large ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl'}`}
          style={{ color: theme.ink }}
        >
          {post.title}
        </h3>
        <p className="mb-6 line-clamp-3 text-sm leading-relaxed" style={{ color: theme.inkMuted }}>
          {post.excerpt}
        </p>
        <div className="mt-auto flex items-center justify-between gap-4">
          <span className="text-xs font-medium" style={{ color: theme.inkMuted }}>
            {post.author} · {formatDate(post.published_at)}
          </span>
          <span
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
            style={{ color: theme.ink }}
          >
            Read
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </motion.a>
  )
}

const PaginationBar = ({ blogPagination }) => {
  const { page, totalPages, tag, pageSize } = blogPagination
  const base = '/blog'
  const q = (p, t) => {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (pageSize && pageSize !== 10) params.set('page_size', String(pageSize))
    if (t) params.set('tag', t)
    const s = params.toString()
    return s ? `${base}?${s}` : base
  }
  const prev = page > 1 ? q(page - 1, tag || undefined) : null
  const next = page < totalPages ? q(page + 1, tag || undefined) : null
  return (
    <div
      className="flex flex-col items-center justify-between gap-6 border-t pt-12 sm:flex-row"
      style={{ borderColor: theme.line }}
    >
      <p className="text-sm" style={{ color: theme.inkMuted }}>
        Page <span style={{ color: theme.ink }}>{page}</span> of {Math.max(1, totalPages)}
      </p>
      <div className="flex items-center gap-3">
        {prev ? (
          <a
            data-vibey-link={prev}
            className="cursor-pointer rounded-full border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: theme.line, color: theme.ink }}
          >
            Previous
          </a>
        ) : (
          <span
            className="rounded-full border px-5 py-2.5 text-sm opacity-40"
            style={{ borderColor: theme.line }}
          >
            Previous
          </span>
        )}
        {next ? (
          <a
            data-vibey-link={next}
            className="cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: theme.ink }}
          >
            Next
          </a>
        ) : (
          <span
            className="rounded-full px-5 py-2.5 text-sm opacity-40"
            style={{ background: theme.line, color: theme.inkMuted }}
          >
            Next
          </span>
        )}
      </div>
    </div>
  )
}

const BlogListingPage = () => {
  const featured = blogPosts[0]
  const rest = useMemo(() => blogPosts.slice(1), [blogPosts])
  const { tags, tag: activeTag } = blogPagination

  const tagHref = (label) => {
    const params = new URLSearchParams()
    if (label) params.set('tag', label)
    const s = params.toString()
    return s ? `/blog?${s}` : '/blog'
  }

  return (
    <div className="min-h-screen" style={{ background: theme.paper, color: theme.ink }}>
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-16 md:px-8">
        <Reveal>
          <p
            className="mb-4 text-xs font-bold uppercase tracking-[0.35em]"
            style={{ color: theme.accent }}
          >
            Journal
          </p>
          <h1 className="mb-6 max-w-3xl font-serif text-5xl tracking-tight md:text-6xl lg:text-7xl">
            Ideas worth
            <br />
            <span style={{ fontStyle: 'italic', color: theme.inkMuted }}>slowing down for.</span>
          </h1>
          <p className="mb-14 max-w-xl text-lg leading-relaxed" style={{ color: theme.inkMuted }}>
            Long-form notes, playbooks, and product thinking—published as we ship.
          </p>
        </Reveal>

        {featured && (
          <Reveal delay={0.08}>
            <div className="mb-16 md:mb-20">
              <div className="mb-6 flex items-end justify-between gap-6">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: theme.inkMuted }}
                >
                  Featured
                </span>
                <a
                  data-vibey-link={`/blog/${featured.slug}`}
                  className="cursor-pointer text-sm font-semibold underline underline-offset-4"
                  style={{ color: theme.ink }}
                >
                  Open story
                </a>
              </div>
              <motion.a
                data-vibey-link={`/blog/${featured.slug}`}
                className="relative block cursor-pointer overflow-hidden rounded-3xl border"
                style={{ borderColor: theme.line }}
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.35 }}
              >
                <div className="grid min-h-[320px] grid-cols-1 lg:grid-cols-12">
                  <div className="relative min-h-[240px] lg:col-span-7 lg:min-h-0">
                    {featured.cover_image ? (
                      <img
                        src={featured.cover_image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(160deg, ${theme.accentSoft} 0%, ${theme.paper2} 100%)`,
                        }}
                      />
                    )}
                  </div>
                  <div
                    className="flex flex-col justify-center p-8 md:p-12 lg:col-span-5"
                    style={{ background: theme.paper2 }}
                  >
                    <p
                      className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: theme.accent }}
                    >
                      {(featured.tags && featured.tags[0]) || 'Editorial'}
                    </p>
                    <h2 className="mb-4 font-serif text-3xl leading-[1.15] md:text-4xl">
                      {featured.title}
                    </h2>
                    <p
                      className="mb-8 line-clamp-4 leading-relaxed"
                      style={{ color: theme.inkMuted }}
                    >
                      {featured.excerpt}
                    </p>
                    <div
                      className="flex items-center gap-3 text-sm"
                      style={{ color: theme.inkMuted }}
                    >
                      <span className="font-medium" style={{ color: theme.ink }}>
                        {featured.author}
                      </span>
                      <span>·</span>
                      <time>{formatDate(featured.published_at)}</time>
                    </div>
                  </div>
                </div>
              </motion.a>
            </div>
          </Reveal>
        )}

        <Reveal delay={0.05}>
          <div className="mb-10 flex flex-wrap items-center gap-2">
            <TagPill label="All topics" active={!activeTag} href="/blog" />
            {(tags || []).map((t) => (
              <TagPill key={t} label={t} active={activeTag === t} href={tagHref(t)} />
            ))}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
          {rest.map((post, i) => (
            <Reveal key={post.id} delay={0.04 * (i % 5)}>
              <StoryCard post={post} large={i === 0 && rest.length > 2} index={i} />
            </Reveal>
          ))}
        </div>

        {blogPosts.length === 0 && (
          <p className="py-24 text-center text-lg" style={{ color: theme.inkMuted }}>
            No posts yet. Check back soon.
          </p>
        )}

        <PaginationBar blogPagination={blogPagination} />
      </div>
    </div>
  )
}

BlogListingPage()
```

---

## 8. Blog post template — TSX example

Editorial article layout: **cover**, **title block**, **tags**, **rich body** from `content` blocks, **related readings**, **back to journal**. Typography-forward; motion on scroll.

```tsx
const { useRef, createElement } = React
const { motion, useInView } = FramerMotion

const theme = {
  ink: '#0c0a09',
  inkMuted: '#57534e',
  paper: '#fafaf9',
  line: '#e7e5e4',
  accent: '#ea580c',
  codeBg: '#1c1917',
}

const Reveal = ({ children, delay = 0 }) => {
  const ref = useRef(null)
  const inv = useInView(ref, { once: true, margin: '-30px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inv ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const ContentBlocks = ({ blocks }) => {
  if (!blocks || !blocks.length) return null
  return (
    <div className="space-y-10 md:space-y-12">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p
                key={i}
                className="text-balance font-serif text-lg leading-[1.75] md:text-xl"
                style={{ color: theme.ink }}
              >
                {block.text}
              </p>
            )
          case 'heading': {
            const level = Math.min(6, Math.max(1, block.level || 2))
            const size =
              level <= 2
                ? 'text-3xl md:text-4xl'
                : level === 3
                  ? 'text-2xl md:text-3xl'
                  : 'text-xl md:text-2xl'
            return createElement(
              `h${level}`,
              {
                key: i,
                className: `font-serif ${size} tracking-tight mt-4`,
                style: { color: theme.ink },
              },
              block.text,
            )
          }
          case 'image':
            return (
              <figure key={i} className="my-4">
                <div
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: theme.line }}
                >
                  <img src={block.src} alt={block.alt || ''} className="block h-auto w-full" />
                </div>
                {block.caption && (
                  <figcaption
                    className="mt-3 text-center text-sm"
                    style={{ color: theme.inkMuted }}
                  >
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul'
            return (
              <ListTag
                key={i}
                className={`space-y-2 pl-6 text-lg leading-relaxed md:pl-8 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
                style={{ color: theme.ink }}
              >
                {(block.items || []).map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ListTag>
            )
          }
          case 'quote':
            return (
              <blockquote
                key={i}
                className="relative border-l-4 py-2 pl-6 md:pl-10"
                style={{ borderColor: theme.accent, color: theme.ink }}
              >
                <p className="mb-4 font-serif text-2xl italic leading-snug md:text-3xl">
                  {block.text}
                </p>
                {block.attribution && (
                  <cite
                    className="text-sm font-medium not-italic"
                    style={{ color: theme.inkMuted }}
                  >
                    — {block.attribution}
                  </cite>
                )}
              </blockquote>
            )
          case 'code':
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-2xl border p-6 font-mono text-sm leading-relaxed"
                style={{ background: theme.codeBg, color: '#fafaf9', borderColor: theme.line }}
              >
                <code>{block.code}</code>
              </pre>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

const RelatedCard = ({ post }) => (
  <a
    data-vibey-link={`/blog/${post.slug}`}
    className="group block cursor-pointer rounded-2xl border p-5 transition-colors duration-200"
    style={{ borderColor: theme.line, background: theme.paper }}
  >
    <p
      className="mb-2 text-[10px] font-bold uppercase tracking-widest"
      style={{ color: theme.accent }}
    >
      {(post.tags && post.tags[0]) || 'Article'}
    </p>
    <h4 className="mb-2 font-serif text-lg leading-snug underline-offset-4 group-hover:underline">
      {post.title}
    </h4>
    <p className="line-clamp-2 text-sm" style={{ color: theme.inkMuted }}>
      {post.excerpt}
    </p>
  </a>
)

const BlogPostPage = () => {
  const p = blogPost
  return (
    <article className="min-h-screen" style={{ background: theme.paper, color: theme.ink }}>
      <header className="relative">
        <div className="absolute left-0 right-0 top-6 z-10 mx-auto max-w-3xl px-5">
          <a
            data-vibey-link="/blog"
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold"
            style={{ color: theme.inkMuted }}
          >
            <ArrowLeft size={16} />
            Back to journal
          </a>
        </div>
        <div className="relative h-[42vh] w-full overflow-hidden md:h-[50vh]">
          {p.cover_image ? (
            <img src={p.cover_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(160deg, #fff7ed 0%, ${theme.paper} 100%)` }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(12,10,9,0.75), transparent 55%)' }}
          />
        </div>
        <div className="relative z-10 mx-auto -mt-28 max-w-3xl px-5 pb-12 md:-mt-36">
          <Reveal>
            <div className="mb-6 flex flex-wrap gap-2">
              {(p.tags || []).map((t) => (
                <span
                  key={t}
                  className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ borderColor: theme.line, color: theme.inkMuted }}
                >
                  {t}
                </span>
              ))}
            </div>
            <h1
              className="mb-6 text-balance font-serif text-4xl leading-[1.08] md:text-5xl lg:text-6xl"
              style={{ color: '#fafaf9', textShadow: '0 2px 40px rgba(0,0,0,0.35)' }}
            >
              {p.title}
            </h1>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
              style={{ color: 'rgba(250,250,249,0.9)' }}
            >
              <span className="font-semibold">{p.author}</span>
              <span>·</span>
              <time>{formatDate(p.published_at)}</time>
            </div>
          </Reveal>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-20 md:pb-28">
        <Reveal delay={0.06}>
          <ContentBlocks blocks={p.content} />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-20 border-t pt-12" style={{ borderColor: theme.line }}>
            <h2 className="mb-8 font-serif text-2xl md:text-3xl">Continue reading</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {(relatedBlogPosts || []).map((rp) => (
                <RelatedCard key={rp.id} post={rp} />
              ))}
            </div>
            {(relatedBlogPosts || []).length === 0 && (
              <p style={{ color: theme.inkMuted }}>More articles are on the way.</p>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-16 text-center">
            <a
              data-vibey-link="/blog"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-8 py-4 text-sm font-bold uppercase tracking-widest"
              style={{ borderColor: theme.ink, color: theme.ink }}
            >
              <ArrowLeft size={16} />
              All posts
            </a>
          </div>
        </Reveal>
      </div>
    </article>
  )
}

BlogPostPage()
```

---

## 9. Implementation notes

- **Defensive defaults:** Treat `blogPosts`, `tags`, and `content` as possibly empty; render empty states without throwing.
- **SEO:** Use `blogPost.seo` in head/meta if your pipeline exposes a meta layer; scope includes `title`, `description`, `og_image` for parity with listings.
- **Styling:** Prefer the **`theme`** object for colors; keep Tailwind for layout/spacing/typography scale.
- **Motion:** Pair Framer Motion reveals with light **anime.js** accents (e.g. title underline draw) only where it reinforces editorial rhythm—avoid gratuitous motion on body copy.
