# Artifact Views Realtime Smoke

Manual check for Phase 1:

1. Open `/spaces` and select a campaign-linked space.
2. Add the `Funnels`, `Offers`, and `Social Posts` views from `+ View`.
3. Insert or create one row in each matching campaign table: `funnels`, `offers`, `social_posts`.
4. Confirm each active view refreshes without a page reload within one second.
5. Confirm clicking the new row opens the preview dialog.

Expected result: all three views update via the `useArtifactRows` Supabase realtime subscription.
