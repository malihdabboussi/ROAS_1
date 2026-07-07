/** Mark portaled toolbar-style menus so parent overlays (e.g. customize slide) ignore outside clicks on them. */
export const VIBEY_SPACE_FLOATING_CONTROL = 'data-vibey-space-floating-control'

/**
 * Portals rendered from customize (outside `panelRef`), e.g. delete confirm — clicks here must not dismiss customize.
 */
export const VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD = 'data-vibey-space-customize-portal-guard'
