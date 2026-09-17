# Changelog - [September 17, 2026]

## [2026-09-17 09:40] - [FIX]

What: apps/web/tsconfig.json pins the React type packages with paths entries (react, react/*, react-dom, react-dom/*) to the app's own node_modules/@types copies.
Why: next build failed at the TypeScript step with 18 errors of the form "'SortableContext' cannot be used as a JSX component" in dnd-kit and Sandpack call sites. A --traceResolution run showed 5 of 2276 react type resolutions landing on a stray /Users/<home>/node_modules/@types/react (version 18) left by an unrelated project: TypeScript walks up parent directories when a third-party declaration file imports react, and those five came from packages whose real path sits in the pnpm store. Two React type versions in one program make every JSX component typed against the other one invalid. Same class of defect as the earlier TS6053 fix for the API apps (typeRoots).
Impact: The web typecheck and next build no longer depend on what lives in parent folders on the developer machine; 0 type errors, all react resolutions to the local 19.2.13 copy. No runtime change.
Files: apps/web/tsconfig.json
