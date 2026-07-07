# TSX Ad Creative System — Full Spec

**Created:** 2026-02-23
**Status:** Ready for execution
**Depends on:** All analysis completed in this session

---

## Problem

Ads are currently flat AI-generated images (Nano Banana Pro). User can't:
- Resize for different placements without regenerating
- Use their own face/headshot in the ad
- Edit text after generation
- Adapt colors when theme changes

## Solution

2-layer system: User images (theme uploads) + TSX-rendered ad components (code → image export).

---

## Phase 1: Theme Image Library

### Database Migration

Add to `branding_themes` table:

```sql
ALTER TABLE branding_themes
  ADD COLUMN IF NOT EXISTS headshot_asset_id UUID REFERENCES media_assets(id),
  ADD COLUMN IF NOT EXISTS product_image_ids UUID[] DEFAULT '{}';
```

### Backend: Campaign Context Service

**File:** `apps/agent-api/src/modules/chat/services/campaign-context.service.ts`

In `buildThemeSummary()`, after fetching the theme row, resolve image URLs:

```typescript
// After line 102 (imageStylePrompt assignment), add:
const logoAssetId = typeof row.logo_asset_id === 'string' ? row.logo_asset_id : null
const headshotAssetId = typeof row.headshot_asset_id === 'string' ? row.headshot_asset_id : null
const productImageIds = Array.isArray(row.product_image_ids) ? row.product_image_ids.filter(Boolean) : []

// Resolve URLs from media_assets
const assetIds = [logoAssetId, headshotAssetId, ...productImageIds].filter(Boolean) as string[]
let assetUrlMap: Record<string, string> = {}
if (assetIds.length > 0) {
  const { data: assets } = await this.supabase
    .from('media_assets')
    .select('id, public_url')
    .in('id', assetIds)
  if (assets) {
    assetUrlMap = Object.fromEntries(assets.map(a => [a.id, a.public_url]))
  }
}

const logoUrl = logoAssetId ? assetUrlMap[logoAssetId] ?? null : null
const headshotUrl = headshotAssetId ? assetUrlMap[headshotAssetId] ?? null : null
const productImageUrls = productImageIds.map(id => assetUrlMap[id]).filter(Boolean)
```

Then add to the output lines (after line 163):

```typescript
logoUrl ? `- logo_url: ${logoUrl}` : null,
headshotUrl ? `- headshot_url: ${headshotUrl}` : null,
productImageUrls.length > 0 ? `- product_images: ${productImageUrls.join(', ')}` : null,
```

### Frontend: ImagesTab.tsx

**File:** `apps/web/src/features/themes/components/ImagesTab.tsx`

Add headshot + product image upload sections ABOVE the existing "Image Style" section.

**Design guidelines to follow:**
- Use `surface-card` containers for upload areas
- Use `body-1` for section titles, `body-3` for descriptions
- Token-based colors only (`text-foreground`, `text-muted-foreground`, `border-border`)
- Use `spacing-*` tokens for all padding/margin
- Upload dropzone: `border border-dashed border-border rounded-spacing-2 p-spacing-6`
- Preview: `rounded-spacing-2 overflow-hidden aspect-square` for headshot, flexible for product images

**New props needed:**
- `headshotAssetId: string | null`
- `headshotUrl: string | null`
- `onUploadHeadshot: (file: File) => Promise<void>`
- `onRemoveHeadshot: () => void`
- `productImageIds: string[]`
- `productImageUrls: string[]`
- `onUploadProductImage: (file: File) => Promise<void>`
- `onRemoveProductImage: (assetId: string) => void`

**Sections to add:**
1. "Your Headshot" — Single image upload (circle preview, 1:1 crop)
2. "Product / Brand Images" — Multi-image grid upload (up to 6)
3. Existing "Image Style" section remains unchanged below

### Frontend: ThemeSettings.tsx

Wire the new ImagesTab props. Will need to:
- Add state for headshot + product images
- Add upload handler that uploads to Supabase Storage → creates media_asset → updates theme
- Pass resolved URLs down

---

## Phase 2: TSX Ad Rendering + Multi-Placement

### Database Migration

```sql
ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS generated_tsx TEXT;
```

### Backend: Artifacts Service

Update `create_ad` case to accept and store `generated_tsx`:

```typescript
// In createAd() method, add:
generated_tsx: (input.generated_tsx as string) ?? null,
```

### Frontend: AdSandpackPreview.tsx (NEW)

New component based on existing `SandpackPreview.tsx` pattern.

**Props:**
- `tsx: string` — The ad TSX code
- `aspectRatio: '1:1' | '4:5' | '9:16'` — Target placement
- `onExportPng?: (blob: Blob) => void` — Export callback

**Behavior:**
- Renders TSX in Sandpack at exact pixel dimensions per aspect ratio
- Aspect ratio selector (pill buttons)
- Dimensions: 1080x1080 (1:1), 1440x1800 (4:5), 1080x1920 (9:16)

### Frontend: AdPreview.tsx Update

When `ad.generated_tsx` exists → render `AdSandpackPreview` instead of static mockup.
When only `ad.image_url` exists → render existing static mockup (backward compatible).

---

## Phase 3: PNG Export

### Frontend: Export Button in AdSandpackPreview

Add "Export as PNG" button using `html2canvas` (already in deps from PDF export).

```typescript
const exportPng = async () => {
  const iframe = sandpackRef.current?.querySelector('iframe')
  const doc = iframe?.contentDocument
  if (!doc) return
  const canvas = await html2canvas(doc.body, { scale: 2, useCORS: true })
  canvas.toBlob((blob) => {
    if (blob) onExportPng?.(blob)
    // Also offer download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ad-${aspectRatio}.png`
    a.click()
  })
}
```

### Auto-export for Meta Publish

When `publish_ad_to_meta` is called and ad has `generated_tsx` but no `image_url`:
- Frontend auto-renders → captures → uploads to media_assets → sets `image_url`
- Then existing Meta publish pipeline picks up `image_url` as normal

---

## Phase 4: Update Ad Builder Skill

### SKILL.md Addition

Add section teaching Vibey to:
1. Check if user has headshot/product images in theme
2. If yes → write TSX component using those real images + theme colors
3. If no → fall back to Nano Banana Pro (current behavior)
4. TSX components accept `{width, height}` as props for responsive layout

### TSX Ad Templates

Add 3-4 template TSX files to `examples/ads/templates/`:
- `authority-ad.tsx` — Speaker headshot + bold text + CTA
- `product-showcase.tsx` — Product image + benefit text
- `dual-image-split.tsx` — Two images side by side

---

## Phase 5: Meta Publish (No Changes Needed)

The existing Meta publish pipeline uses `ads.image_url`. After Phase 3 (PNG export), the image URL is populated. Zero changes to Meta integration code.

---

## Execution Order

| Phase | Files Changed | Effort |
|---|---|---|
| Phase 1 | 1 migration + campaign-context.service.ts + ImagesTab.tsx + ThemeSettings.tsx | Medium |
| Phase 2 | 1 migration + artifacts.service.ts + AdSandpackPreview.tsx (new) + AdPreview.tsx | Medium-Large |
| Phase 3 | AdSandpackPreview.tsx (add export) | Small |
| Phase 4 | ad-builder/SKILL.md + example templates | Medium |
| Phase 5 | None | Free |

---

## Key Files to Read Before Each Phase

### Phase 1
- `apps/web/src/features/themes/components/ImagesTab.tsx` (DONE - 160 lines)
- `apps/web/src/features/themes/types/index.ts` (DONE - 213 lines)
- `apps/agent-api/src/modules/chat/services/campaign-context.service.ts` (DONE - 258 lines)
- `apps/web/src/features/studio/components/settings/ThemeSettings.tsx` (NEED TO READ)
- `apps/web/src/features/themes/components/design/*` (for upload pattern reference)

### Phase 2
- `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts` (create_ad section)
- `apps/web/src/features/studio/components/preview/AdPreview.tsx`
- `apps/web/src/features/studio/components/preview/ArtifactsTab.tsx` (ad rendering section)
- Existing `SandpackPreview.tsx` (for pattern)

### Phase 3
- `SandpackPreview.tsx` (PDF export section for html2canvas pattern)

### Phase 4
- `docker/agents/vibey/skills/ad-builder/SKILL.md`
- `docker/agents/vibey/examples/ads/INDEX.md`
