# Auth Access Routing Utility

Last updated: 2026-07-17

## Purpose

`apps/web/src/lib/auth/access-routing.ts` centralizes authenticated access decisions and safe post-auth app destinations.

Use it when login, registration, or an auth callback needs to preserve an internal destination without accepting an external redirect or corrupting its existing query parameters.

## API

- `resolveAppRedirectPath(requestedRedirect)`: returns a normalized same-app path, query, and fragment. Invalid, absolute, protocol-relative, and non-path values fall back to `/home`.
- `buildAppRedirectUrl(appOrigin, requestedRedirect, searchParams)`: builds a URL on `appOrigin` and merges non-empty callback parameters into the destination's existing query.
- `buildAuthContinuationPath(authPath, requestedRedirect, promo)`: builds an auth-page link that carries a validated app destination and normalized promo code through login, registration, and password recovery.
- `resolveAccessStatus(input)`: resolves subscription and organization membership checks to `granted`, `denied`, or `unknown`.
- `resolveAuthenticatedRedirect(input)`: returns the required onboarding, access, or home destination for an authenticated request, or `null` when the current route should continue.

## Behavior

- Post-auth destinations must stay on the current app origin.
- Existing destination queries and fragments are preserved.
- Callback values such as `promo` and `message` are merged with `URLSearchParams`, never appended with raw string concatenation.
- Missing or unsafe destinations fall back to `/home`.
- Signed-out dashboard deep links enter Login with their original path and query in the validated `redirect` parameter.

## Used By

- Web auth middleware access routing.
- Login, registration, verification, and password-recovery destinations.
- The server auth callback.

## Testing

Tests live in `apps/web/src/lib/auth/access-routing.test.ts` and cover access decisions, valid internal destinations, external/protocol-relative rejection, fallback behavior, auth-page continuation links, and callback query merging. Middleware tests cover protected route classification and deep-link preservation before Login.

## Change History

- 2026-07-17: Added safe post-auth destination normalization, auth-page continuation links, callback query merging, and protected-route continuation through Login.
