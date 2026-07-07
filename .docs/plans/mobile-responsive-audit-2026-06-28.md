# Mobile Responsive Audit - June 28, 2026

## Scope

- Source: `$mobile-optimization` Playwright audit plus source inventory scan.
- App: `apps/web` on local `http://localhost:3000`.
- Auth: saved YC demo Playwright storage state from `yc-demo@vibey.im`.
- Browser: system Chrome via Playwright `--browser-channel chrome`.
- Viewports: `iphone-se` 375x667, `iphone-modern` 390x844, `android-compact` 360x800, `tablet-portrait` 768x1024.
- Static page inventory: 39 `page.tsx` files; audit covered 29 static routes and skipped 10 dynamic route patterns.
- Modal inventory: 210 modal/dialog/dropdown/picker-like source files discovered by filename scan. These are inventoried below but not automatically opened by the route-only audit.

## Result

- Merged actionable static-route findings: 297.
- High severity: 23; medium: 99; low: 175.
- Finding types: small-tap-target: 175, clipped-content: 99, element-overflows-viewport: 23.
- Raw reports: `/private/tmp/mobile-responsive-audit-static-2026-06-28.json`, `/private/tmp/mobile-responsive-audit-rerun-stable-2026-06-28.json`.

## Important Caveats

- This is a page-load audit, not a full interaction crawler. Modals, dropdown menus, drawers, popovers, artifact menus, and editor panels need scripted open-state checks.
- Auth utility routes can redirect when already signed in. For those, the report records the destination that was actually audited.
- `/oauth-callback` without real OAuth query params redirects and produced non-actionable overflow findings on the redirected destination. Treat it as needing a dedicated OAuth callback scenario, not as a page-layout bug yet.
- Rendered pages did not expose representative detail URLs as normal anchors during the crawl, so dynamic routes still need explicit IDs or scripted clicks.

## Highest Priority Static Page Findings

- `/contacts`: 20 high, 4 medium, 19 low. Final path(s): `/contacts`. Types: small-tap-target 19, clipped-content 4, element-overflows-viewport 20.
- `/setting-up`: 3 high, 4 medium, 0 low. Final path(s): `/setting-up`. Types: clipped-content 4, element-overflows-viewport 3.

## Static Route Table

| Route | Final path(s) | Findings | Types | Viewports | Samples |
| --- | --- | ---: | --- | --- | --- |
| `/contacts` | `/contacts` | H 20<br>M 4<br>L 19<br>Total 43 | small-tap-target: 19<br>clipped-content: 4<br>element-overflows-viewport: 20 | iphone-se: 5<br>iphone-modern: 5<br>android-compact: 5<br>tablet-portrait: 28 | iphone-se: low small-tap-target button.pill.pill--sm.pill--active text="All"<br>iphone-se: low small-tap-target button.pill.pill--sm text="Lead"<br>iphone-se: low small-tap-target button.pill.pill--sm text="Customer"<br>iphone-se: low small-tap-target button.pill.pill--sm text="Archived" |
| `/setting-up` | `/setting-up` | H 3<br>M 4<br>L 0<br>Total 7 | clipped-content: 4<br>element-overflows-viewport: 3 | iphone-se: 2<br>iphone-modern: 2<br>android-compact: 2<br>tablet-portrait: 1 | iphone-se: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="GETTING YOUR VIBEY UP TO SPEED Identity Context Capabilities Memory Preparing yo"<br>iphone-se: high element-overflows-viewport span.chip-glass-neutral.body-2.text-muted-foreground.shrink-0 text="Memory"<br>iphone-modern: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="GETTING YOUR VIBEY UP TO SPEED Identity Context Capabilities Memory Preparing yo"<br>iphone-modern: high element-overflows-viewport span.chip-glass-neutral.body-2.text-muted-foreground.shrink-0 text="Memory" |
| `/` | `/home` | H 0<br>M 8<br>L 17<br>Total 25 | clipped-content: 8<br>small-tap-target: 17 | iphone-se: 6<br>iphone-modern: 4<br>android-compact: 8<br>tablet-portrait: 7 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/fast-track-success` | `/home` | H 0<br>M 8<br>L 17<br>Total 25 | clipped-content: 8<br>small-tap-target: 17 | iphone-se: 6<br>iphone-modern: 4<br>android-compact: 8<br>tablet-portrait: 7 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/login` | `/home` | H 0<br>M 8<br>L 17<br>Total 25 | clipped-content: 8<br>small-tap-target: 17 | iphone-se: 6<br>iphone-modern: 4<br>android-compact: 8<br>tablet-portrait: 7 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/onboarding` | `/home` | H 0<br>M 8<br>L 17<br>Total 25 | clipped-content: 8<br>small-tap-target: 17 | iphone-se: 6<br>iphone-modern: 4<br>android-compact: 8<br>tablet-portrait: 7 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/register` | `/home` | H 0<br>M 8<br>L 17<br>Total 25 | clipped-content: 8<br>small-tap-target: 17 | iphone-se: 6<br>iphone-modern: 4<br>android-compact: 8<br>tablet-portrait: 7 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/home` | `/home` | H 0<br>M 8<br>L 13<br>Total 21 | clipped-content: 8<br>small-tap-target: 13 | iphone-se: 6<br>iphone-modern: 0<br>android-compact: 8<br>tablet-portrait: 7 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/join` | `/home` | H 0<br>M 8<br>L 10<br>Total 18 | clipped-content: 8<br>small-tap-target: 10 | iphone-se: 6<br>iphone-modern: 4<br>android-compact: 8<br>tablet-portrait: 0 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/invite` | `/home` | H 0<br>M 8<br>L 6<br>Total 14 | clipped-content: 8<br>small-tap-target: 6 | iphone-se: 6<br>iphone-modern: 0<br>android-compact: 8<br>tablet-portrait: 0 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/forgot-password` | `/forgot-password` | H 0<br>M 4<br>L 4<br>Total 8 | clipped-content: 4<br>small-tap-target: 4 | iphone-se: 2<br>iphone-modern: 2<br>android-compact: 2<br>tablet-portrait: 2 | iphone-se: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Back to sign in Reset your password We will email you a reset link. Send reset l"<br>iphone-se: low small-tap-target a.body-3.text-muted-foreground.hover:text-foreground.gap-spacing-2 text="Back to sign in"<br>iphone-modern: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Back to sign in Reset your password We will email you a reset link. Send reset l"<br>iphone-modern: low small-tap-target a.body-3.text-muted-foreground.hover:text-foreground.gap-spacing-2 text="Back to sign in" |
| `/reset-password` | `/reset-password` | H 0<br>M 4<br>L 4<br>Total 8 | clipped-content: 4<br>small-tap-target: 4 | iphone-se: 2<br>iphone-modern: 2<br>android-compact: 2<br>tablet-portrait: 2 | iphone-se: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Back to sign in Set a new password Choose a strong password for your account. Up"<br>iphone-se: low small-tap-target a.body-3.text-muted-foreground.hover:text-foreground.gap-spacing-2 text="Back to sign in"<br>iphone-modern: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Back to sign in Set a new password Choose a strong password for your account. Up"<br>iphone-modern: low small-tap-target a.body-3.text-muted-foreground.hover:text-foreground.gap-spacing-2 text="Back to sign in" |
| `/integrations/connected` | `/integrations/connected` | H 0<br>M 4<br>L 0<br>Total 4 | clipped-content: 4 | iphone-se: 1<br>iphone-modern: 1<br>android-compact: 1<br>tablet-portrait: 1 | iphone-se: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECTION FAILED Close this tab and try again from Integrations."<br>iphone-modern: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECTION FAILED Close this tab and try again from Integrations."<br>android-compact: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECTION FAILED Close this tab and try again from Integrations."<br>tablet-portrait: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECTION FAILED Close this tab and try again from Integrations." |
| `/mcp/consent` | `/mcp/consent` | H 0<br>M 4<br>L 0<br>Total 4 | clipped-content: 4 | iphone-se: 1<br>iphone-modern: 1<br>android-compact: 1<br>tablet-portrait: 1 | iphone-se: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY Missing MCP connection request."<br>iphone-modern: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY Missing MCP connection request."<br>android-compact: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY Missing MCP connection request."<br>tablet-portrait: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY Missing MCP connection request." |
| `/mcp/success` | `/mcp/success` | H 0<br>M 4<br>L 0<br>Total 4 | clipped-content: 4 | iphone-se: 1<br>iphone-modern: 1<br>android-compact: 1<br>tablet-portrait: 1 | iphone-se: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY This connection link is no longer valid. Close this window and try"<br>iphone-modern: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY This connection link is no longer valid. Close this window and try"<br>android-compact: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY This connection link is no longer valid. Close this window and try"<br>tablet-portrait: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="CONNECT VIBEY This connection link is no longer valid. Close this window and try" |
| `/verify-email` | `/verify-email` | H 0<br>M 4<br>L 0<br>Total 4 | clipped-content: 4 | iphone-se: 1<br>iphone-modern: 1<br>android-compact: 1<br>tablet-portrait: 1 | iphone-se: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Verify your email We sent a confirmation link to your email. Resend confirmation"<br>iphone-modern: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Verify your email We sent a confirmation link to your email. Resend confirmation"<br>android-compact: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Verify your email We sent a confirmation link to your email. Resend confirmation"<br>tablet-portrait: medium clipped-content main.text-foreground.tpl-surface--light.relative.grid text="Verify your email We sent a confirmation link to your email. Resend confirmation" |
| `/no-org-access` | `/home` | H 0<br>M 3<br>L 14<br>Total 17 | clipped-content: 3<br>small-tap-target: 14 | iphone-se: 6<br>iphone-modern: 4<br>android-compact: 0<br>tablet-portrait: 7 | iphone-se: medium clipped-content div.relative.bg-transparent.border-0.p-0 text="Auto New Workspace"<br>iphone-se: medium clipped-content div text="Auto New Workspace"<br>iphone-se: medium clipped-content div.flex.items-center.justify-between.px-spacing-2 text="Auto New Workspace"<br>iphone-se: low small-tap-target button.body-3.text-muted-foreground.hover:text-foreground.inline-flex text="New Workspace" |
| `/team/skills` | `/team/skills` | H 0<br>M 0<br>L 20<br>Total 20 | small-tap-target: 20 | iphone-se: 5<br>iphone-modern: 5<br>android-compact: 5<br>tablet-portrait: 5 | iphone-se: low small-tap-target button.rounded-lg.px-3.py-1.5.text-xs text="Jaime"<br>iphone-se: low small-tap-target button.rounded-lg.px-3.py-1.5.text-xs text="Manage"<br>iphone-se: low small-tap-target button.inline-flex.h-7.shrink-0.items-center text="Group by"<br>iphone-se: low small-tap-target button.rounded-md.p-1.5.text-[var(--color-muted-foreground)].transition-colors |

## Static Routes With No Findings In This Pass

- `/brain` -> `/brain`
- `/campaigns` -> `/campaigns`
- `/flows` -> `/flows`
- `/home/channels` -> `/home/channels`
- `/lists` -> `/spaces`
- `/org-setup` -> `/org-setup`
- `/spaces` -> `/spaces`
- `/studio` -> `/team`
- `/team` -> `/team`
- `/team/teams` -> `/team/teams`

## Dynamic Routes Not Audited Yet

- `/a/[agentKey]`
- `/campaigns/[id]`
- `/contacts/[id]`
- `/home/channels/[id]`
- `/invite/[token]`
- `/projects/[id]`
- `/shared/item/[token]`
- `/shared/space/[token]`
- `/team/teams/[teamId]`
- `/unsubscribe/[token]`

Needed next step: provide representative YC demo IDs or add scripted clicks for these routes, then run the audit with `--paths`.

## Special Route Requiring Dedicated Scenario

- `/oauth-callback`: raw route-only run produced H 69, M 7, L 5, but final path(s) were `/oauth-callback`, `/`. Do not treat these as confirmed OAuth page bugs until tested with realistic OAuth callback params.

## Modal Remediation Strategy

- Do not start by rewriting every modal. The app already has shared modal utilities, so the first remediation pass should use those existing CSS hooks.
- Current modal CSS split: `z-modal-*` utilities mainly handle overlay and stacking; `container-modal-*` utilities are the shared sizing hooks that can be hardened centrally.
- Do not turn `z-modal-layer-3`, `z-modal-layer-4`, or `z-modal-content` into layout utilities. They are used across many overlay contexts and should stay focused on stacking.
- First fix path: harden `container-modal-sm`, `container-modal-md`, `container-modal-lg`, `container-modal-xl`, `container-modal-2xl`, `container-modal-3xl`, and `container-modal-task-detail` for mobile viewport width, safe max-height, and scroll containment.
- Then migrate only legacy modal wrappers that still bypass the shared container utilities or fail scripted mobile open-state checks. This keeps the existing design and avoids a one-off edit campaign across all 210 inventoried surfaces.
- Complex surfaces such as media browsers, settings, mission/task detail, editors, and table-heavy dialogs may still need targeted shell logic, but only after the shared CSS pass and Playwright evidence show the central utility path is insufficient.

## Desktop Preservation Gate

- Every mobile optimization fix must preserve the current desktop layout unless the user explicitly asks for a desktop change.
- Before editing a route or modal, capture or inspect the same surface at a desktop viewport, preferably the existing 1440px-class layout and the relevant open modal/panel state.
- Prefer mobile-only changes or mobile-first classes with explicit desktop restoration through existing `md:`/`lg:` patterns.
- If a base class or global utility changes, verify the desktop rule path still resolves to the previous layout.
- After editing, rerun the mobile check and recheck the desktop surface. Do not mark a mobile fix complete if desktop spacing, hierarchy, content order, action visibility, or modal sizing changed unintentionally.

## Modal And Interaction Surface Inventory

These files are the current modal-like, dropdown-like, picker-like, drawer-like, or popover-like surfaces discovered by source filename scan. They are the missing interactive coverage list for mobile audit scenarios.

### apps/web/src/lib (1)

- `apps/web/src/lib/hooks/useColorPicker.ts`

### components/agents (1)

- `apps/web/src/components/agents/RemoveOrgMemberConfirmModal.tsx`

### components/artifacts (8)

- `apps/web/src/components/artifacts/AdArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/ArtifactDeleteConfirmModal.tsx`
- `apps/web/src/components/artifacts/AvatarArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/EmailArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/FormArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/FunnelArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/PresentationArtifactMenuDropdown.tsx`
- `apps/web/src/components/artifacts/SequenceArtifactMenuDropdown.tsx`

### components/channels (4)

- `apps/web/src/components/channels/AddPeopleToChannelModal.tsx`
- `apps/web/src/components/channels/ChannelSettingsModal.tsx`
- `apps/web/src/components/channels/CreateChannelModal.tsx`
- `apps/web/src/components/channels/StartBrainstormModal.tsx`

### components/chat (1)

- `apps/web/src/components/chat/model-picker/ComposerModelPicker.tsx`

### components/conversations (1)

- `apps/web/src/components/conversations/ConversationShareModal.tsx`

### components/datetime (2)

- `apps/web/src/components/datetime/TimePicker.tsx`
- `apps/web/src/components/datetime/TimezoneSelect.tsx`

### components/deliverables (2)

- `apps/web/src/components/deliverables/DeliverablePreviewBrainConfirmDialog.tsx`
- `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`

### components/domains (4)

- `apps/web/src/components/domains/AddCustomDomainDialog.tsx`
- `apps/web/src/components/domains/ConnectCustomDomainModal.tsx`
- `apps/web/src/components/domains/CustomDomainDnsDialog.tsx`
- `apps/web/src/components/domains/DeleteCustomDomainDialog.tsx`

### components/flows (1)

- `apps/web/src/components/flows/FlowsGroupByToolbarPopover.tsx`

### components/layout (6)

- `apps/web/src/components/layout/DeleteCampaignDialog.tsx`
- `apps/web/src/components/layout/NewCampaignModal.tsx`
- `apps/web/src/components/layout/SearchModal.tsx`
- `apps/web/src/components/layout/sidebar/SidebarBrainFlyout.tsx`
- `apps/web/src/components/layout/sidebar/SidebarHqMobileDrawer.tsx`
- `apps/web/src/components/layout/sidebar/SidebarTeam2Flyout.tsx`

### components/media (6)

- `apps/web/src/components/media/AddFromUrlModal.tsx`
- `apps/web/src/components/media/DriveFileBrowserModal.tsx`
- `apps/web/src/components/media/DropboxFileBrowserDeleteDialog.tsx`
- `apps/web/src/components/media/DropboxFileBrowserModal.tsx`
- `apps/web/src/components/media/MediaGenerateModal.tsx`
- `apps/web/src/components/media/MediaPickerModal.tsx`

### components/modals (5)

- `apps/web/src/app/(dashboard)/campaigns/[id]/finance/components/modals/AddPriceModal.tsx`
- `apps/web/src/app/(dashboard)/campaigns/[id]/finance/components/modals/NewCouponModal.tsx`
- `apps/web/src/app/(dashboard)/campaigns/[id]/finance/components/modals/NewPaymentLinkModal.tsx`
- `apps/web/src/app/(dashboard)/campaigns/[id]/finance/components/modals/NewProductModal.tsx`
- `apps/web/src/app/(dashboard)/campaigns/[id]/finance/components/modals/ProductDetailModal.tsx`

### components/org (1)

- `apps/web/src/components/org/ShareModal.tsx`

### components/transfer (1)

- `apps/web/src/components/transfer/TransferDialog.tsx`

### components/ui (5)

- `apps/web/src/components/ui/ColorPicker.tsx`
- `apps/web/src/components/ui/IconPicker.tsx`
- `apps/web/src/components/ui/dialogs/ConfirmDialog.tsx`
- `apps/web/src/components/ui/forms/AutomationSolidSelect.tsx`
- `apps/web/src/components/ui/forms/SettingsSelect.tsx`

### features/autopilot (1)

- `apps/web/src/features/autopilot/components/AutopilotModal.tsx`

### features/billing (5)

- `apps/web/src/features/billing/components/CreditDepletedDialog.tsx`
- `apps/web/src/features/billing/components/CreditPurchaseDialog.tsx`
- `apps/web/src/features/billing/components/CreditPurchaseSuccessDialog.tsx`
- `apps/web/src/features/billing/components/LimitReachedDialog.tsx`
- `apps/web/src/features/billing/components/PlanUpgradeSuccessDialog.tsx`

### features/brain (13)

- `apps/web/src/features/brain/components/CampaignAddInfoDomainSelect.tsx`
- `apps/web/src/features/brain/components/CampaignAddInfoFathomDialog.tsx`
- `apps/web/src/features/brain/components/CampaignAddInfoFirefliesDialog.tsx`
- `apps/web/src/features/brain/components/CampaignBrainIconPicker.tsx`
- `apps/web/src/features/brain/components/CortexMaxModal.tsx`
- `apps/web/src/features/brain/components/CrystallizeBrainModal.tsx`
- `apps/web/src/features/brain/components/NodeDetailDeleteDialog.tsx`
- `apps/web/src/features/brain/components/NodeDetailModal.tsx`
- `apps/web/src/features/brain/components/NodeDetailTransferDialog.tsx`
- `apps/web/src/features/brain/components/TrainingPanelFathomDialog.tsx`
- `apps/web/src/features/brain/components/TrainingPanelFirefliesDialog.tsx`
- `apps/web/src/features/brain/components/training/BrainTrainTargetSelect.tsx`
- `apps/web/src/features/brain/components/training/TrainingModal.tsx`

### features/channels (7)

- `apps/web/src/features/channels/components/AddPeopleToChannelModal.tsx`
- `apps/web/src/features/channels/components/BrandedEmojiPicker.tsx`
- `apps/web/src/features/channels/components/ChannelPickerModal.tsx`
- `apps/web/src/features/channels/components/ChannelSettingsModal.tsx`
- `apps/web/src/features/channels/components/CreateChannelModal.tsx`
- `apps/web/src/features/channels/components/EntityMentionPicker.tsx`
- `apps/web/src/features/channels/components/StartBrainstormModal.tsx`

### features/composer (1)

- `apps/web/src/features/composer/pasted-text/PastedTextEditorModal.tsx`

### features/contacts (1)

- `apps/web/src/features/contacts/components/CrmContactsFilterDrawer.tsx`

### features/domains (3)

- `apps/web/src/features/domains/components/AddCustomDomainDialog.tsx`
- `apps/web/src/features/domains/components/CustomDomainDnsDialog.tsx`
- `apps/web/src/features/domains/components/DeleteCustomDomainDialog.tsx`

### features/email (4)

- `apps/web/src/features/email/components/domains/AddEmailDomainDialog.tsx`
- `apps/web/src/features/email/components/domains/DeleteDomainDialog.tsx`
- `apps/web/src/features/email/components/domains/DnsRecordsDialog.tsx`
- `apps/web/src/features/email/components/sender-identities/AddSenderIdentityDialog.tsx`

### features/flows (3)

- `apps/web/src/features/flows/components/FlowMenuDropdown.tsx`
- `apps/web/src/features/flows/components/FlowValidationAttentionModal.tsx`
- `apps/web/src/features/flows/components/FlowsGroupByToolbarPopover.tsx`

### features/home (2)

- `apps/web/src/features/home/components/HomeFeedScopePicker.tsx`
- `apps/web/src/features/home/components/SuggestionReviewModal.tsx`

### features/mission-control (5)

- `apps/web/src/features/mission-control/components/MissionListDeleteDialog.tsx`
- `apps/web/src/features/mission-control/components/NotificationsFeedModal.tsx`
- `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`
- `apps/web/src/features/mission-control/components/dialogs/PlanDetailModal.tsx`
- `apps/web/src/features/mission-control/components/mission-menu/MissionMenuDropdown.tsx`

### features/notifications (1)

- `apps/web/src/features/notifications/components/NotificationFeedFilterPicker.tsx`

### features/org (3)

- `apps/web/src/features/org/components/CreateOrgDialog.tsx`
- `apps/web/src/features/org/components/OrgLogoPicker.tsx`
- `apps/web/src/features/org/components/ShareModal.tsx`

### features/projects (1)

- `apps/web/src/features/projects/components/RepoImportModal.tsx`

### features/properties (1)

- `apps/web/src/features/properties/components/segments/SegmentSearchableMultiSelect.tsx`

### features/settings (17)

- `apps/web/src/features/settings/components/EnterpriseApplicationModal.tsx`
- `apps/web/src/features/settings/components/SettingsSelect.tsx`
- `apps/web/src/features/settings/components/settings-content/ConfirmDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/FacebookPagePickerModal.tsx`
- `apps/web/src/features/settings/components/settings-content/LinkedInCompanyPagePickerModal.tsx`
- `apps/web/src/features/settings/components/settings-content/WordpressConnectDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/YoutubeChannelPickerModal.tsx`
- `apps/web/src/features/settings/components/settings-content/billing-page/dialogs/PlanChangeConfirmDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/properties/custom-fields/CustomFieldDeleteDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/properties/custom-fields/CustomFieldEditorDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/properties/segments/SegmentDeleteDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/properties/segments/SegmentEditorDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/properties/segments/SegmentViewDialog.tsx`
- `apps/web/src/features/settings/components/settings-content/skills-page/skill-menu/SkillMenuDropdown.tsx`
- `apps/web/src/features/settings/components/settings-content/skills-page/skills-agent-tab-menu/SkillsAgentTabMenuDropdown.tsx`
- `apps/web/src/features/settings/containers/AccountSettingsModal.tsx`
- `apps/web/src/features/settings/containers/WorkspaceSettingsModal.tsx`

### features/spaces (46)

- `apps/web/src/features/spaces/components/CategoryEditorModal.tsx`
- `apps/web/src/features/spaces/components/CreateSpaceModal.tsx`
- `apps/web/src/features/spaces/components/ShareModal.tsx`
- `apps/web/src/features/spaces/components/StatusEditorModal.tsx`
- `apps/web/src/features/spaces/components/ViewShareModal.tsx`
- `apps/web/src/features/spaces/components/artifacts/SpacesArtifactDeleteConfirmModal.tsx`
- `apps/web/src/features/spaces/components/artifacts/ad/AdMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/avatar/AvatarMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/EmailArtifactSendDialog.tsx`
- `apps/web/src/features/spaces/components/artifacts/email/EmailMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormLogoPicker.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormQuestionTypePicker.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/FormSettingsTaskTitlePicker.tsx`
- `apps/web/src/features/spaces/components/artifacts/form/TargetSpacePicker.tsx`
- `apps/web/src/features/spaces/components/artifacts/funnel/FunnelMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/funnels/CreateFunnelTypeModal.tsx`
- `apps/web/src/features/spaces/components/artifacts/offer/OfferMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/presentation/PresentationMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/sequence/SequenceMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/artifacts/social-post/SocialPostMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/automations/AutomationCategorizedSelect.tsx`
- `apps/web/src/features/spaces/components/automations/AutomationLazySelect.tsx`
- `apps/web/src/features/spaces/components/automations/AutomationRosterSelect.tsx`
- `apps/web/src/features/spaces/components/cells/date-picker/RecurrenceCloneOptionsModal.tsx`
- `apps/web/src/features/spaces/components/cells/date-picker/SpacesScheduleDateTimeModal.tsx`
- `apps/web/src/features/spaces/components/chat/ConversationShareModal.tsx`
- `apps/web/src/features/spaces/components/chat/SpaceChatAgentPicker.tsx`
- `apps/web/src/features/spaces/components/doc-menu/DocMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/docs/DocCoverPickerModal.tsx`
- `apps/web/src/features/spaces/components/docs/properties/CategoryPicker.tsx`
- `apps/web/src/features/spaces/components/instagram-research/ContentAnalysisModal.tsx`
- `apps/web/src/features/spaces/components/media-menu/MediaMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/reporting/shared/FacebookReportingPagePicker.tsx`
- `apps/web/src/features/spaces/components/reporting/shared/LinkedInReportingCompanyPagePicker.tsx`
- `apps/web/src/features/spaces/components/reporting/shared/YoutubeReportingChannelPicker.tsx`
- `apps/web/src/features/spaces/components/social-research/DeleteSavedTopicSearchConfirmModal.tsx`
- `apps/web/src/features/spaces/components/task-detail/SendTaskToAgentModal.tsx`
- `apps/web/src/features/spaces/components/task-detail/SendTaskToAgentModePicker.tsx`
- `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.tsx`
- `apps/web/src/features/spaces/components/task-menu/TaskDuplicateModal.tsx`
- `apps/web/src/features/spaces/components/task-menu/TaskMenuDropdown.tsx`
- `apps/web/src/features/spaces/components/templates/UseTemplateConfirmDialog.tsx`
- `apps/web/src/features/spaces/components/views/AddViewTemplateModal.tsx`
- `apps/web/src/features/spaces/components/your-turn/YourTurnSubtaskDrawer.tsx`
- `apps/web/src/features/spaces/views/media/MediaGenerateModal.tsx`

### features/studio (23)

- `apps/web/src/features/studio/components/ChatInput/ContextBreakdownPopover.tsx`
- `apps/web/src/features/studio/components/StudioSearchModal.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsAddManualDialog.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsImportAcDialog.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsImportCsvDialog.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsImportGhlDialog.tsx`
- `apps/web/src/features/studio/components/preview/AllContactsModal.tsx`
- `apps/web/src/features/studio/components/preview/CampaignDateTimePopover.tsx`
- `apps/web/src/features/studio/components/preview/ConnectCustomDomainModal.tsx`
- `apps/web/src/features/studio/components/preview/CreateMetaPixelDialog.tsx`
- `apps/web/src/features/studio/components/preview/MetaIntegrationsReviewModal.tsx`
- `apps/web/src/features/studio/components/preview/MetaPublishModal.tsx`
- `apps/web/src/features/studio/components/preview/PresentationThemePalettePicker.tsx`
- `apps/web/src/features/studio/components/preview/StudioAdMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/StudioAvatarMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/StudioFunnelMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/StudioPresentationMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/StudioSequenceMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/ad-canvas/components/GenerationSourcePicker.tsx`
- `apps/web/src/features/studio/components/preview/artifacts/modals/BulkDeleteArtifactModal.tsx`
- `apps/web/src/features/studio/components/preview/artifacts/modals/DeleteArtifactModal.tsx`
- `apps/web/src/features/studio/components/preview/artifacts/tree/FolderMenuDropdown.tsx`
- `apps/web/src/features/studio/components/preview/social-post-preview/SocialPostScheduleDialog.tsx`

### features/team (8)

- `apps/web/src/features/team/components/CampaignTeamManageModal.tsx`
- `apps/web/src/features/team/components/FireEmployeeConfirmModal.tsx`
- `apps/web/src/features/team/components/SlackSetupDialog.tsx`
- `apps/web/src/features/team/components/TelegramSetupDialog.tsx`
- `apps/web/src/features/team/components/chat/AllChatsMediaModal.tsx`
- `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoAccessTeamSelect.tsx`
- `apps/web/src/features/team/components/ready-employees-modal/ReadyEmployeesModal.tsx`
- `apps/web/src/features/team/containers/WidgetBuilderModal.tsx`

### features/team-2 (8)

- `apps/web/src/features/team-2/components/AgentListModelPicker.tsx`
- `apps/web/src/features/team-2/components/ConversationScopePicker.tsx`
- `apps/web/src/features/team-2/components/Team2GroupByToolbarPopover.tsx`
- `apps/web/src/features/team-2/components/checkpoints/AgentCheckpointDiffModal.tsx`
- `apps/web/src/features/team-2/components/checkpoints/AgentCheckpointRestoreDialog.tsx`
- `apps/web/src/features/team-2/components/teams/TeamDetailRemoveDialog.tsx`
- `apps/web/src/features/team-2/components/teams/TeamOverviewChatModal.tsx`
- `apps/web/src/features/team-2/components/teams/TeamsGroupByToolbarPopover.tsx`

### features/themes (6)

- `apps/web/src/features/themes/components/FontPicker.tsx`
- `apps/web/src/features/themes/components/TextColorPicker.tsx`
- `apps/web/src/features/themes/components/ThemeBrandingImportDialog.tsx`
- `apps/web/src/features/themes/components/ThemeEditorDialog.tsx`
- `apps/web/src/features/themes/components/ThemeFileImportDialog.tsx`
- `apps/web/src/features/themes/components/ThemeSettingsModal.tsx`

### features/transfer (1)

- `apps/web/src/features/transfer/components/TransferDialog.tsx`

### features/updates (1)

- `apps/web/src/features/updates/components/FeatureUpdateDetailModal.tsx`

## Page Source Inventory

All `apps/web/src/app/**/page.tsx` files found during this audit:

- `apps/web/src/app/(auth)/fast-track-success/page.tsx`
- `apps/web/src/app/(auth)/forgot-password/page.tsx`
- `apps/web/src/app/(auth)/integrations/connected/page.tsx`
- `apps/web/src/app/(auth)/invite/[token]/page.tsx`
- `apps/web/src/app/(auth)/invite/page.tsx`
- `apps/web/src/app/(auth)/join/page.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/mcp/consent/page.tsx`
- `apps/web/src/app/(auth)/mcp/success/page.tsx`
- `apps/web/src/app/(auth)/no-org-access/page.tsx`
- `apps/web/src/app/(auth)/oauth-callback/page.tsx`
- `apps/web/src/app/(auth)/onboarding/page.tsx`
- `apps/web/src/app/(auth)/org-setup/page.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(auth)/reset-password/page.tsx`
- `apps/web/src/app/(auth)/setting-up/page.tsx`
- `apps/web/src/app/(auth)/verify-email/page.tsx`
- `apps/web/src/app/(dashboard)/brain/page.tsx`
- `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`
- `apps/web/src/app/(dashboard)/campaigns/page.tsx`
- `apps/web/src/app/(dashboard)/contacts/[id]/page.tsx`
- `apps/web/src/app/(dashboard)/contacts/page.tsx`
- `apps/web/src/app/(dashboard)/flows/page.tsx`
- `apps/web/src/app/(dashboard)/home/channels/[id]/page.tsx`
- `apps/web/src/app/(dashboard)/home/channels/page.tsx`
- `apps/web/src/app/(dashboard)/home/page.tsx`
- `apps/web/src/app/(dashboard)/lists/page.tsx`
- `apps/web/src/app/(dashboard)/page.tsx`
- `apps/web/src/app/(dashboard)/projects/[id]/page.tsx`
- `apps/web/src/app/(dashboard)/spaces/page.tsx`
- `apps/web/src/app/(dashboard)/studio/page.tsx`
- `apps/web/src/app/(dashboard)/team/page.tsx`
- `apps/web/src/app/(dashboard)/team/skills/page.tsx`
- `apps/web/src/app/(dashboard)/team/teams/[teamId]/page.tsx`
- `apps/web/src/app/(dashboard)/team/teams/page.tsx`
- `apps/web/src/app/a/[agentKey]/page.tsx`
- `apps/web/src/app/shared/item/[token]/page.tsx`
- `apps/web/src/app/shared/space/[token]/page.tsx`
- `apps/web/src/app/unsubscribe/[token]/page.tsx`

## Recommended Next Audit Slices

1. Fix or inspect confirmed high static findings first: `/contacts` and `/setting-up`.
2. Start modal remediation with the CSS utility pass above, then audit open modal states rather than editing all modal files individually.
3. Add scripted open-state checks for shared/global modals: sidebar mobile drawer, search modal, campaign modal, channel modals, media picker, deliverable preview, and transfer/share dialogs.
4. Add scripted open-state checks for feature-heavy modal clusters: Spaces artifacts/task/detail menus, Studio preview menus/import dialogs, Settings dialogs, Team/Team-2 modals, and Brain training/detail dialogs.
5. Add representative dynamic route paths for campaign detail, contact detail, channel detail, team detail, shared item/space, public agent, invite token, project detail, and unsubscribe token.
