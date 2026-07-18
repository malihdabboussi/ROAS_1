# Space item links

Last modified: 2026-07-17

`apps/web/src/lib/spaces/space-item-href.ts` is the shared source for links that open a specific task or document inside Spaces.

The supported route is:

`/spaces?space={spaceId}&item={itemId}`

Use `buildSpaceItemHref` for new links. Use `parseSpaceItemHref` or `normalizeSpaceItemHref` when reading persisted or externally supplied links. The parser accepts the retired `/spaces/{spaceId}/{itemId}` shape so existing saved records can be opened through the current route instead of returning a 404.
