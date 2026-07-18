# Global Artifacts API

## Purpose

Builds the account-wide artifact library by merging Space and conversation documents, campaign artifacts, and media assets into the shared shell artifact viewer contract.

## Data flow

`fetchGlobalArtifacts` loads every page of documents and media, combines those results with account-scoped campaign artifacts, campaigns, and Spaces, then normalizes and sorts the items for the All Artifacts page.

Campaign artifact families include funnels, websites, presentations, offers, sequences, emails, avatars, ads, social posts, blogs, and funnel pages. The account boundary combines the active organization with personal legacy rows owned by the signed-in user. Uploaded media is marked separately from generated or platform-created work so the page can hide uploads by default.

## Files

- `apps/web/src/lib/artifacts/global-artifacts-api.ts`
- `apps/web/src/lib/artifacts/global-artifacts-contracts.ts`
- `apps/api/src/modules/entity-search/services/entity-artifact-search.service.ts`
- `apps/api/src/modules/entity-search/repositories/entity-artifact-search.repository.ts`

Last Modified: July 17, 2026
