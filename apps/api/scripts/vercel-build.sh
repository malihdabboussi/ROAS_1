#!/bin/bash
set -euo pipefail

# Build script for Vercel deployment
ROOT="$(cd ../.. && pwd)"
API_ROOT="${ROOT}/apps/api"
WORKSPACE_PKGS=(agent-policy api-shared)

# 1. Build workspace packages the API depends on
cd "${ROOT}"
npx pnpm@9 --filter=@vibey/agent-policy --filter=@vibey/api-shared run build

# 2. Rewrite workspace:* to file: for Vercel's npm-based function bundler
cd "${API_ROOT}"
node -e "const p=require('./package.json');for (const pkg of ['api-shared','agent-policy']) { p.dependencies['@vibey/'+pkg]='file:../../packages/'+pkg; } require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2))"

# 3. Re-install API deps after rewrite so workspace packages are materialized for bundling
cd "${ROOT}"
npx pnpm@9 install --no-frozen-lockfile --filter @vibey/api...

# 4. Build the NestJS API
cd "${API_ROOT}"
npx @nestjs/cli build

materialize_workspace_pkg() {
  local pkg="$1"
  local src="${ROOT}/packages/${pkg}"
  local targets=(
    "${API_ROOT}/node_modules/@vibey/${pkg}"
    "${ROOT}/node_modules/@vibey/${pkg}"
    "${ROOT}/packages/@vibey/${pkg}"
  )

  for target in "${targets[@]}"; do
    rm -rf "${target}"
    mkdir -p "$(dirname "${target}")"
    cp -r "${src}" "${target}"
  done
}

# 5. Materialize workspace packages where Node + Vercel tracing can find them
mkdir -p "${ROOT}/packages/@vibey" "${ROOT}/node_modules/@vibey"
for pkg in "${WORKSPACE_PKGS[@]}"; do
  materialize_workspace_pkg "${pkg}"
done

# 6. Sanity-check runtime entrypoints exist in the API bundle
for pkg in "${WORKSPACE_PKGS[@]}"; do
  test -f "${API_ROOT}/node_modules/@vibey/${pkg}/dist/index.js"
done

echo "vercel-build: materialized @vibey workspace packages for serverless runtime"
