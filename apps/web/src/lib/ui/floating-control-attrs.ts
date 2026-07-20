/** Mark portaled toolbar-style menus so parent overlays (e.g. customize slide) ignore outside clicks on them. */
export const VIBEY_SPACE_FLOATING_CONTROL = 'data-vibey-space-floating-control'

/**
 * Portals rendered from customize (outside `panelRef`), e.g. delete confirm — clicks here must not dismiss customize.
 */
export const VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD = 'data-vibey-space-customize-portal-guard'

/**
 * Portaled menus opened from a HubDockFlyout (brain / space / campaign context menus, add-space, etc.).
 * HubDockFlyout outside-click + leave must treat these as still "inside" the dock.
 */
export const HUB_DOCK_PORTAL_GUARD = 'data-hub-dock-portal-guard'
